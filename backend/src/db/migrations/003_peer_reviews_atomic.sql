-- ==============================================================================
-- Migration: 003_peer_reviews_atomic.sql
-- Module: FR-09, FR-10, FR-11 Post-Match Peer Reviews & Atomic Credit Mutation
-- Target: PostgreSQL 15+ / Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_peer_reviews_atomic(
    p_session_id UUID,
    p_reviewer_id UUID,
    p_reviews JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_reviewer_participant_id UUID;
    v_item JSONB;
    v_target_participant_id_text TEXT;
    v_target_participant_id UUID;
    v_target_user_id UUID;
    v_is_guest BOOLEAN;
    v_attendance TEXT;
    v_sportsmanship TEXT;
    v_level_fit TEXT;
    v_notes TEXT;
    v_review_id UUID;
    v_current_score INTEGER;
    v_session_delta INTEGER;
    v_next_session_delta INTEGER;
    v_applied_delta INTEGER;
    v_total_applied_delta INTEGER;
    v_rule_name TEXT;
    v_rule_delta INTEGER;
    v_attended_votes INTEGER;
    v_no_show_votes INTEGER;
    v_majority_status TEXT;
    v_total_completed INTEGER;
    v_total_attended INTEGER;
    v_show_up_rate NUMERIC(5, 2);
    v_submitted_count INTEGER := 0;
    v_skipped_guests JSONB := '[]'::jsonb;
    v_results JSONB := '[]'::jsonb;
BEGIN
    -- 1. Validasi parameter dasar
    IF p_session_id IS NULL OR p_reviewer_id IS NULL THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'INVALID_INPUT',
            'message', 'session_id dan reviewer_id wajib disertakan.'
        );
    END IF;

    IF p_reviews IS NULL OR jsonb_typeof(p_reviews) <> 'array' OR jsonb_array_length(p_reviews) = 0 THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'INVALID_INPUT',
            'message', 'Daftar reviews harus berupa array minimal 1 item.'
        );
    END IF;

    -- 2. Kunci baris sesi agar mutasi kumulatif per sesi berjalan serial dan konsisten
    SELECT id, status
    INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'SESSION_NOT_FOUND',
            'message', 'Sesi tidak ditemukan.'
        );
    END IF;

    IF v_session.status <> 'COMPLETED' THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'INVALID_STATUS',
            'message', 'Peer review hanya dapat dikirim untuk sesi berstatus COMPLETED.'
        );
    END IF;

    -- 3. Pastikan reviewer adalah peserta aktif (non-CANCELLED) sesi ini
    SELECT id
    INTO v_reviewer_participant_id
    FROM public.session_participants
    WHERE session_id = p_session_id
      AND user_id = p_reviewer_id
      AND attendance_status <> 'CANCELLED'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'NOT_PARTICIPANT',
            'message', 'Reviewer bukan peserta aktif pada sesi ini.'
        );
    END IF;

    -- 4. Fase validasi read-only seluruh item sebelum melakukan penulisan DB
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_reviews)
    LOOP
        IF jsonb_typeof(v_item) <> 'object' THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'Setiap item review harus berupa object.'
            );
        END IF;

        IF v_item ? 'is_guest' AND jsonb_typeof(v_item->'is_guest') <> 'boolean' THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'Field is_guest harus bernilai boolean.'
            );
        END IF;

        v_is_guest := COALESCE((v_item->>'is_guest')::BOOLEAN, FALSE);
        v_target_participant_id_text := v_item->>'target_participant_id';

        IF v_target_participant_id_text IS NULL
           OR v_target_participant_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'target_participant_id harus berupa UUID yang valid.'
            );
        END IF;

        v_attendance := v_item->>'attendance';
        v_sportsmanship := v_item->>'sportsmanship';
        v_level_fit := v_item->>'level_fit';

        IF v_attendance NOT IN ('on_time', 'late', 'no_show') THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'Nilai attendance tidak valid (on_time | late | no_show).'
            );
        END IF;

        IF v_sportsmanship NOT IN ('good', 'okay', 'poor') THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'Nilai sportsmanship tidak valid (good | okay | poor).'
            );
        END IF;

        IF v_level_fit NOT IN ('lower', 'accurate', 'higher') THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'INVALID_INPUT',
                'message', 'Nilai level_fit tidak valid (lower | accurate | higher).'
            );
        END IF;

        IF v_is_guest THEN
            v_skipped_guests := v_skipped_guests || jsonb_build_array(
                jsonb_build_object(
                    'target_participant_id', v_target_participant_id_text,
                    'reason', 'Guest participant dilewati karena skema tabel guest belum tersedia.'
                )
            );
            CONTINUE;
        END IF;

        v_target_participant_id := v_target_participant_id_text::UUID;

        SELECT user_id
        INTO v_target_user_id
        FROM public.session_participants
        WHERE id = v_target_participant_id
          AND session_id = p_session_id
          AND attendance_status <> 'CANCELLED'
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'TARGET_NOT_PARTICIPANT',
                'message', 'Target peserta tidak terdaftar sebagai peserta aktif pada sesi ini.'
            );
        END IF;

        IF v_target_user_id = p_reviewer_id THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'SELF_REVIEW',
                'message', 'Reviewer tidak dapat memberikan review untuk dirinya sendiri.'
            );
        END IF;
    END LOOP;

    -- 5. Fase penulisan atomik: unique_violation otomatis rollback seluruh sub-blok
    BEGIN
        FOR v_item IN SELECT value FROM jsonb_array_elements(p_reviews)
        LOOP
            v_is_guest := COALESCE((v_item->>'is_guest')::BOOLEAN, FALSE);
            IF v_is_guest THEN
                CONTINUE;
            END IF;

            v_target_participant_id := (v_item->>'target_participant_id')::UUID;
            v_attendance := v_item->>'attendance';
            v_sportsmanship := v_item->>'sportsmanship';
            v_level_fit := v_item->>'level_fit';
            v_notes := NULLIF(BTRIM(v_item->>'notes'), '');

            SELECT user_id
            INTO v_target_user_id
            FROM public.session_participants
            WHERE id = v_target_participant_id
              AND session_id = p_session_id
              AND attendance_status <> 'CANCELLED'
            LIMIT 1;

            -- 5a. Insert peer review (mengandalkan UNIQUE(session_id, reviewer_id, target_user_id))
            INSERT INTO public.peer_reviews (
                session_id,
                reviewer_id,
                target_user_id,
                attendance,
                sportsmanship,
                level_fit,
                notes
            )
            VALUES (
                p_session_id,
                p_reviewer_id,
                v_target_user_id,
                v_attendance,
                v_sportsmanship,
                v_level_fit,
                v_notes
            )
            RETURNING id INTO v_review_id;

            -- 5b. Kunci baris profil target & ambil akumulasi delta sesi saat ini
            SELECT credit_score
            INTO v_current_score
            FROM public.profiles
            WHERE id = v_target_user_id
            FOR UPDATE;

            SELECT COALESCE(SUM(delta), 0)::INTEGER
            INTO v_session_delta
            FROM public.credit_transactions
            WHERE user_id = v_target_user_id
              AND session_id = p_session_id;

            v_total_applied_delta := 0;

            -- Rule 1: Attendance (KARMA_RULES)
            IF v_attendance = 'on_time' THEN
                v_rule_name := 'ATTEND_ON_TIME';
                v_rule_delta := 2;
            ELSIF v_attendance = 'late' THEN
                v_rule_name := 'LATE_ARRIVAL';
                v_rule_delta := -5;
            ELSE
                v_rule_name := 'NO_SHOW';
                v_rule_delta := -20;
            END IF;

            v_next_session_delta := LEAST(10, GREATEST(-25, v_session_delta + v_rule_delta));
            v_applied_delta := v_next_session_delta - v_session_delta;

            IF v_applied_delta <> 0 THEN
                v_session_delta := v_next_session_delta;
                v_total_applied_delta := v_total_applied_delta + v_applied_delta;
                v_current_score := LEAST(100, GREATEST(0, v_current_score + v_applied_delta));

                INSERT INTO public.credit_transactions (
                    user_id,
                    session_id,
                    delta,
                    reason,
                    balance_after
                )
                VALUES (
                    v_target_user_id,
                    p_session_id,
                    v_applied_delta,
                    v_rule_name,
                    v_current_score
                );
            END IF;

            -- Rule 2: Sportsmanship (abaikan bonus jika no_show; okay/poor = 0)
            IF v_attendance <> 'no_show' AND v_sportsmanship = 'good' THEN
                v_rule_name := 'COMMENDED_SPORTSMANSHIP';
                v_rule_delta := 5;

                v_next_session_delta := LEAST(10, GREATEST(-25, v_session_delta + v_rule_delta));
                v_applied_delta := v_next_session_delta - v_session_delta;

                IF v_applied_delta <> 0 THEN
                    v_session_delta := v_next_session_delta;
                    v_total_applied_delta := v_total_applied_delta + v_applied_delta;
                    v_current_score := LEAST(100, GREATEST(0, v_current_score + v_applied_delta));

                    INSERT INTO public.credit_transactions (
                        user_id,
                        session_id,
                        delta,
                        reason,
                        balance_after
                    )
                    VALUES (
                        v_target_user_id,
                        p_session_id,
                        v_applied_delta,
                        v_rule_name,
                        v_current_score
                    );
                END IF;
            END IF;

            -- 5c. Tentukan attendance_status peserta berdasarkan mayoritas reviewer di sesi ini
            SELECT
                COUNT(*) FILTER (WHERE attendance IN ('on_time', 'late'))::INTEGER,
                COUNT(*) FILTER (WHERE attendance = 'no_show')::INTEGER
            INTO v_attended_votes, v_no_show_votes
            FROM public.peer_reviews
            WHERE session_id = p_session_id
              AND target_user_id = v_target_user_id;

            IF v_no_show_votes > v_attended_votes THEN
                v_majority_status := 'NO_SHOW';
            ELSE
                v_majority_status := 'ATTENDED';
            END IF;

            UPDATE public.session_participants
            SET attendance_status = v_majority_status
            WHERE id = v_target_participant_id
              AND session_id = p_session_id
              AND attendance_status <> 'CANCELLED';

            -- 5d. Hitung ulang metrik reputasi dari data sesi COMPLETED non-CANCELLED
            SELECT
                COUNT(DISTINCT sp.session_id)::INTEGER,
                COUNT(DISTINCT sp.session_id) FILTER (WHERE sp.attendance_status = 'ATTENDED')::INTEGER
            INTO v_total_completed, v_total_attended
            FROM public.session_participants sp
            INNER JOIN public.sessions s ON s.id = sp.session_id
            WHERE sp.user_id = v_target_user_id
              AND s.status = 'COMPLETED'
              AND sp.attendance_status <> 'CANCELLED';

            IF v_total_completed = 0 THEN
                v_show_up_rate := 100.00;
            ELSE
                v_show_up_rate := ROUND((100.0 * v_total_attended::NUMERIC) / v_total_completed::NUMERIC, 2);
            END IF;

            -- 5e. Update profil target secara atomik (credit_score, suspend flag, dan metrik)
            UPDATE public.profiles
            SET credit_score = v_current_score,
                is_suspended = (v_current_score <= 50),
                total_sessions_completed = v_total_completed,
                show_up_rate = v_show_up_rate,
                updated_at = NOW()
            WHERE id = v_target_user_id;

            v_submitted_count := v_submitted_count + 1;
            v_results := v_results || jsonb_build_array(
                jsonb_build_object(
                    'review_id', v_review_id,
                    'target_participant_id', v_target_participant_id,
                    'target_user_id', v_target_user_id,
                    'delta_applied', v_total_applied_delta,
                    'credit_score_after', v_current_score,
                    'is_suspended', (v_current_score <= 50),
                    'attendance_status', v_majority_status,
                    'total_sessions_completed', v_total_completed,
                    'show_up_rate', v_show_up_rate
                )
            );
        END LOOP;
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object(
                'ok', false,
                'code', 'DUPLICATE_REVIEW',
                'message', 'Review duplikat: Anda sudah pernah menilai peserta ini pada sesi yang sama.'
            );
    END;

    RETURN jsonb_build_object(
        'ok', true,
        'session_id', p_session_id,
        'reviewer_id', p_reviewer_id,
        'submitted_count', v_submitted_count,
        'skipped_guests', v_skipped_guests,
        'results', v_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_peer_reviews_atomic(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_peer_reviews_atomic(UUID, UUID, JSONB) TO service_role;
