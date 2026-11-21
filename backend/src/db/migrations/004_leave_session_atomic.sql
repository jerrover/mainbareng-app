-- ==============================================================================
-- Migration: 004_leave_session_atomic.sql
-- Module: FR-05, FR-06 Session Participant Leave / Atomic Slot Release
-- Target: PostgreSQL 15+ / Supabase
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.leave_session_atomic(
    p_session_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_session RECORD;
    v_participant RECORD;
    v_remaining_active INTEGER;
    v_released_slot INTEGER;
    v_reopened BOOLEAN := false;
BEGIN
    -- 1. Validasi parameter dasar
    IF p_session_id IS NULL OR p_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'session_id and user_id are required'
        );
    END IF;

    -- 2. Lock baris session untuk mencegah race condition (FOR UPDATE)
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Session not found'
        );
    END IF;

    -- 3. Validasi status sesi: hanya OPEN atau LOCKED yang boleh di-leave
    IF v_session.status NOT IN ('OPEN', 'LOCKED') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Cannot cancel slot on a session that is already ' || v_session.status
        );
    END IF;

    -- 4. Guard: Host tidak boleh leave slot biasa (harus cancel session)
    IF v_session.host_id = p_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Host cannot leave session as participant. Please cancel or reassign the session instead.'
        );
    END IF;

    -- 5. Cari partisipasi aktif user (FOR UPDATE)
    SELECT * INTO v_participant
    FROM public.session_participants
    WHERE session_id = p_session_id
      AND user_id = p_user_id
      AND attendance_status != 'CANCELLED'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User is not an active participant in this session'
        );
    END IF;

    v_released_slot := v_participant.slot_number;

    -- 6. Batalkan partisipasi: set CANCELLED, catat cancelled_at, dan reset assigned_team
    UPDATE public.session_participants
    SET attendance_status = 'CANCELLED',
        cancelled_at = NOW(),
        assigned_team = NULL
    WHERE id = v_participant.id;

    -- 7. Hitung ulang jumlah peserta aktif yang tersisa
    SELECT COUNT(*) INTO v_remaining_active
    FROM public.session_participants
    WHERE session_id = p_session_id
      AND attendance_status != 'CANCELLED';

    -- 8. Jika sesi tadinya LOCKED, otomatis buka kembali jadi OPEN
    IF v_session.status = 'LOCKED' AND v_remaining_active < v_session.max_slots THEN
        UPDATE public.sessions
        SET status = 'OPEN',
            updated_at = NOW()
        WHERE id = p_session_id;
        v_reopened := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Slot cancelled successfully',
        'released_slot', v_released_slot,
        'session_reopened', v_reopened,
        'remaining_participants', v_remaining_active
    );
END;
$$;
