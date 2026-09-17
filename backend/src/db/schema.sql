-- ==============================================================================
-- MABAR (MainBareng) Database Schema Baseline (Week 3 - Week 5)
-- Target: PostgreSQL / Supabase
-- Covers: FR-01, FR-02, FR-03, FR-05 (Atomic Lock), FR-06, FR-13
-- ==============================================================================

-- 1. Profiles (FR-01, FR-02)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone_number TEXT,
    credit_score INTEGER NOT NULL DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 100),
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Game/Sports Identities & Skill Ratings (FR-02, FR-11)
CREATE TABLE IF NOT EXISTS public.user_activity_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'futsal', 'badminton', 'mlbb', 'valorant'
    in_game_name TEXT,
    game_id_tag TEXT,
    preferred_role TEXT, -- e.g. 'midlane', 'forward', 'striker'
    skill_rating_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (skill_rating_level IN ('Beginner', 'Intermediate', 'Advanced')),
    skill_rating_points INTEGER NOT NULL DEFAULT 1200,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_type)
);

-- 3. Venues Catalog (FR-13)
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Tangerang',
    category TEXT NOT NULL, -- 'sports' or 'esports'
    supported_activities TEXT[] NOT NULL,
    rate_hourly_min INTEGER NOT NULL DEFAULT 0,
    rate_hourly_max INTEGER NOT NULL DEFAULT 0,
    contact_whatsapp TEXT,
    maps_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sessions (FR-03, FR-04, FR-06)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    session_category TEXT NOT NULL CHECK (session_category IN ('sports', 'esports')),
    session_mode TEXT NOT NULL CHECK (session_mode IN ('play_now', 'scheduled')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    custom_location TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    max_slots INTEGER NOT NULL CHECK (max_slots > 1),
    min_credit_score INTEGER NOT NULL DEFAULT 70,
    required_skill_level TEXT,
    team_format TEXT NOT NULL DEFAULT '2_teams' CHECK (team_format IN ('free_for_all', '2_teams')),
    estimated_cost_total INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Session Participants & Slots (FR-05, FR-08)
CREATE TABLE IF NOT EXISTS public.session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL,
    assigned_team TEXT CHECK (assigned_team IN ('Team A', 'Team B', NULL)),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attendance_status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (attendance_status IN ('CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED')),
    UNIQUE(session_id, slot_number),
    UNIQUE(session_id, user_id)
);

-- ==============================================================================
-- ATOMIC LOCKING FUNCTION (MITIGATES RISK R-01 & SATISFIES FR-05, FR-06)
-- Prevents overbooking across distributed/serverless app instances.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.join_session_atomic(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_user_credit INTEGER;
    v_current_count INTEGER;
    v_next_slot INTEGER;
    v_already_joined BOOLEAN;
BEGIN
    -- 1. Lock the session row exclusively
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    IF v_session.status != 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is no longer open for joining');
    END IF;

    -- 2. Verify User Credit Score
    SELECT credit_score INTO v_user_credit
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_user_credit < v_session.min_credit_score THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit score below session requirement');
    END IF;

    -- 3. Check duplicate participation
    SELECT EXISTS(
        SELECT 1 FROM public.session_participants
        WHERE session_id = p_session_id AND user_id = p_user_id
    ) INTO v_already_joined;

    IF v_already_joined THEN
        RETURN jsonb_build_object('success', false, 'message', 'User already joined this session');
    END IF;

    -- 4. Count active participants
    SELECT COUNT(*) INTO v_current_count
    FROM public.session_participants
    WHERE session_id = p_session_id AND attendance_status != 'CANCELLED';

    IF v_current_count >= v_session.max_slots THEN
        -- Auto lock if not already
        UPDATE public.sessions SET status = 'LOCKED', updated_at = NOW() WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'message', 'Session is full');
    END IF;

    v_next_slot := v_current_count + 1;

    -- 5. Insert participant record atomically
    INSERT INTO public.session_participants (session_id, user_id, slot_number)
    VALUES (p_session_id, p_user_id, v_next_slot);

    -- 6. Check if quota reached after this join (FR-06 Auto Lock)
    IF v_next_slot >= v_session.max_slots THEN
        UPDATE public.sessions
        SET status = 'LOCKED', updated_at = NOW()
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Joined successfully',
        'slot_number', v_next_slot,
        'session_locked', (v_next_slot >= v_session.max_slots)
    );
END;
$$;
