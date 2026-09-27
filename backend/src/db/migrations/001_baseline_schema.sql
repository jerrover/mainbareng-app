-- ==============================================================================
-- MABAR (MainBareng) Production Database Schema (Week 3 - Week 5 Baseline)
-- Target: PostgreSQL / Supabase
-- Covers: FR-01 s/d FR-14, NFR-01 (Atomic Concurrency), NFR-02 (RLS Security)
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES & USER IDENTITY (FR-01, FR-02)
-- Linked directly to Supabase auth.users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone_number TEXT,
    credit_score INTEGER NOT NULL DEFAULT 100 CHECK (credit_score >= 0 AND credit_score <= 100),
    total_sessions_completed INTEGER NOT NULL DEFAULT 0 CHECK (total_sessions_completed >= 0),
    show_up_rate NUMERIC(5, 2) NOT NULL DEFAULT 100.00 CHECK (show_up_rate >= 0.00 AND show_up_rate <= 100.00),
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. USER GAME/SPORTS IDENTITIES & SKILL RATINGS (FR-02, FR-11)
-- Separate Skill Ratings and roles per activity (Sports & Esports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_activity_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- e.g. 'futsal', 'badminton', 'mlbb', 'valorant'
    in_game_name TEXT,
    game_id_tag TEXT,
    preferred_role TEXT, -- e.g. 'midlane', 'forward', 'striker', 'anchor'
    skill_rating_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (skill_rating_level IN ('Beginner', 'Intermediate', 'Advanced')),
    skill_rating_points INTEGER NOT NULL DEFAULT 1200 CHECK (skill_rating_points >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, activity_type)
);

-- ==============================================================================
-- 3. VENUES CATALOG (FR-13)
-- Physical venues or gaming cafes with tariff & WhatsApp booking info
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Tangerang',
    category TEXT NOT NULL CHECK (category IN ('sports', 'esports')),
    supported_activities TEXT[] NOT NULL DEFAULT '{}',
    rate_hourly_min INTEGER NOT NULL DEFAULT 0 CHECK (rate_hourly_min >= 0),
    rate_hourly_max INTEGER NOT NULL DEFAULT 0 CHECK (rate_hourly_max >= 0),
    contact_whatsapp TEXT,
    maps_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. SESSIONS (FR-03, FR-04, FR-06, FR-12)
-- ==============================================================================
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
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    end_time TIMESTAMPTZ,
    max_slots INTEGER NOT NULL CHECK (max_slots > 1),
    min_credit_score INTEGER NOT NULL DEFAULT 70 CHECK (min_credit_score >= 0 AND min_credit_score <= 100),
    required_skill_level TEXT CHECK (required_skill_level IS NULL OR required_skill_level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
    team_format TEXT NOT NULL DEFAULT '2_teams' CHECK (team_format IN ('free_for_all', '2_teams')),
    estimated_cost_total INTEGER NOT NULL DEFAULT 0 CHECK (estimated_cost_total >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. SESSION PARTICIPANTS & SLOTS (FR-05, FR-07, FR-08)
-- Uses Partial Unique Index to gracefully handle cancellations without collision
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slot_number INTEGER NOT NULL CHECK (slot_number > 0),
    assigned_team TEXT CHECK (assigned_team IN ('Team A', 'Team B', NULL)),
    attendance_status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (attendance_status IN ('CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ
);

-- Partial Unique Indexes (Crucial for cancellation & re-joining without primary key clashes)
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_active_slot 
    ON public.session_participants(session_id, slot_number) 
    WHERE attendance_status != 'CANCELLED';

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_active_user 
    ON public.session_participants(session_id, user_id) 
    WHERE attendance_status != 'CANCELLED';

-- ==============================================================================
-- 6. POST-MATCH PEER REVIEWS (FR-09, FR-10, FR-11)
-- Captures attendance, sportsmanship, and skill accuracy per participant
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.peer_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance TEXT NOT NULL CHECK (attendance IN ('on_time', 'late', 'no_show')),
    sportsmanship TEXT NOT NULL CHECK (sportsmanship IN ('good', 'okay', 'poor')),
    level_fit TEXT NOT NULL CHECK (level_fit IN ('lower', 'accurate', 'higher')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (reviewer_id != target_user_id),
    UNIQUE (session_id, reviewer_id, target_user_id)
);

-- ==============================================================================
-- 7. CREDIT SCORE TRANSACTIONS LEDGER (FR-10 Audit Log)
-- Audit history of all Credit Score increments and penalties
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    balance_after INTEGER NOT NULL CHECK (balance_after >= 0 AND balance_after <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. COMMUNITY SAFETY & MODERATION (FR-14)
-- User reports and mutual blocklist
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    reason_category TEXT NOT NULL CHECK (reason_category IN ('harassment', 'no_show', 'cheating', 'hate_speech', 'other')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (reporter_id != reported_user_id)
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (blocker_id != blocked_id),
    UNIQUE (blocker_id, blocked_id)
);

-- ==============================================================================
-- 9. SOCIAL & FRIENDS NETWORK (FR-17)
-- Stateful M:N relationship between users for friendship and lobby invites
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (requester_id != addressee_id),
    UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.session_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (inviter_id != invitee_id),
    UNIQUE (session_id, invitee_id)
);

-- ==============================================================================
-- INDEXING FOR FOREIGN KEYS & DISCOVERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_credit_score ON public.profiles(credit_score);
CREATE INDEX IF NOT EXISTS idx_user_activity_profiles_user_id ON public.user_activity_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON public.sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_venue_id ON public.sessions(venue_id);
CREATE INDEX IF NOT EXISTS idx_sessions_discovery ON public.sessions(status, session_category, start_time);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_session_id ON public.peer_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_target_user_id ON public.peer_reviews(target_user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_session_id ON public.session_invites(session_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_invitee_id ON public.session_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_inviter_id ON public.session_invites(inviter_id);

-- ==============================================================================
-- ATOMIC LOCKING FUNCTION (MITIGATES RISK R-01 & SATISFIES FR-05, FR-06)
-- Prevents overbooking across distributed/serverless app instances.
-- Finds lowest unoccupied slot and handles re-joins properly.
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
    v_user_profile RECORD;
    v_active_count INTEGER;
    v_available_slot INTEGER;
    v_already_joined BOOLEAN;
    v_existing_cancelled_id UUID;
BEGIN
    -- 1. Lock the session row exclusively for atomic concurrency
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

    -- 2. Verify User Profile & Credit Score
    SELECT * INTO v_user_profile
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
    END IF;

    IF v_user_profile.is_suspended THEN
        RETURN jsonb_build_object('success', false, 'message', 'Account is suspended');
    END IF;

    IF v_user_profile.credit_score < v_session.min_credit_score THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit score below session requirement');
    END IF;

    -- 3. Check if user is already actively participating
    SELECT EXISTS(
        SELECT 1 FROM public.session_participants
        WHERE session_id = p_session_id 
          AND user_id = p_user_id 
          AND attendance_status != 'CANCELLED'
    ) INTO v_already_joined;

    IF v_already_joined THEN
        RETURN jsonb_build_object('success', false, 'message', 'User already joined this session');
    END IF;

    -- 4. Count active participants
    SELECT COUNT(*) INTO v_active_count
    FROM public.session_participants
    WHERE session_id = p_session_id AND attendance_status != 'CANCELLED';

    IF v_active_count >= v_session.max_slots THEN
        -- Auto lock session if quota reached
        UPDATE public.sessions SET status = 'LOCKED', updated_at = NOW() WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'message', 'Session is full');
    END IF;

    -- 5. Find lowest available slot number (1 .. max_slots)
    SELECT s.slot INTO v_available_slot
    FROM generate_series(1, v_session.max_slots) AS s(slot)
    WHERE s.slot NOT IN (
        SELECT slot_number
        FROM public.session_participants
        WHERE session_id = p_session_id AND attendance_status != 'CANCELLED'
    )
    ORDER BY s.slot ASC
    LIMIT 1;

    IF v_available_slot IS NULL THEN
        UPDATE public.sessions SET status = 'LOCKED', updated_at = NOW() WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'message', 'No vacant slot available');
    END IF;

    -- 6. Insert new participant or reactivate cancelled record
    SELECT id INTO v_existing_cancelled_id
    FROM public.session_participants
    WHERE session_id = p_session_id AND user_id = p_user_id AND attendance_status = 'CANCELLED'
    LIMIT 1;

    IF v_existing_cancelled_id IS NOT NULL THEN
        UPDATE public.session_participants
        SET slot_number = v_available_slot,
            attendance_status = 'CONFIRMED',
            cancelled_at = NULL,
            joined_at = NOW()
        WHERE id = v_existing_cancelled_id;
    ELSE
        INSERT INTO public.session_participants (session_id, user_id, slot_number, attendance_status)
        VALUES (p_session_id, p_user_id, v_available_slot, 'CONFIRMED');
    END IF;

    -- 7. Check if quota reached after this join (FR-06 Auto Lock)
    IF (v_active_count + 1) >= v_session.max_slots THEN
        UPDATE public.sessions
        SET status = 'LOCKED', updated_at = NOW()
        WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Joined successfully',
        'slot_number', v_available_slot,
        'session_locked', ((v_active_count + 1) >= v_session.max_slots)
    );
END;
$$;

-- ==============================================================================
-- AUTOMATIC AUTH SYNC TRIGGER
-- Automatically creates a public.profiles record whenever a user signs up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (NFR-02)
-- Enforces data isolation and permission boundaries
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_invites ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read basic profile info; user can update own profile
CREATE POLICY "Public profiles are viewable by everyone" 
    ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User Activity Profiles: Viewable by everyone; editable by owner
CREATE POLICY "Activity profiles viewable by everyone" 
    ON public.user_activity_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own activity profile" 
    ON public.user_activity_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity profile" 
    ON public.user_activity_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Venues: Viewable by all authenticated & anon users
CREATE POLICY "Venues catalog is viewable by everyone" 
    ON public.venues FOR SELECT USING (true);

-- Sessions: Viewable by everyone; Host can create and update own session
CREATE POLICY "Sessions are viewable by everyone" 
    ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions" 
    ON public.sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update own sessions" 
    ON public.sessions FOR UPDATE USING (auth.uid() = host_id);

-- Session Participants: Viewable by everyone
CREATE POLICY "Participants viewable by everyone" 
    ON public.session_participants FOR SELECT USING (true);
CREATE POLICY "Participants can leave/cancel own slot" 
    ON public.session_participants FOR UPDATE USING (auth.uid() = user_id);

-- Peer Reviews: Participants of the session can view and create reviews
CREATE POLICY "Reviews viewable by session participants" 
    ON public.peer_reviews FOR SELECT USING (true);
CREATE POLICY "Users can submit reviews as reviewer" 
    ON public.peer_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Credit Transactions: Users can only view their own credit audit history
CREATE POLICY "Users view own credit ledger" 
    ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- User Reports & Blocks: Users can manage own reports and block list
CREATE POLICY "Users can view own reports" 
    ON public.user_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can submit reports" 
    ON public.user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can manage own block list" 
    ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- Friendships (FR-17): Users can view, send requests, accept/reject, or remove
CREATE POLICY "Users can view own friendships" 
    ON public.friendships FOR SELECT 
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" 
    ON public.friendships FOR INSERT 
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can update friendship status" 
    ON public.friendships FOR UPDATE 
    USING (auth.uid() = addressee_id);

CREATE POLICY "Either user can remove friendship" 
    ON public.friendships FOR DELETE 
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Session Invites (FR-17): Inviter and Invitee interaction
CREATE POLICY "Users can view own session invites" 
    ON public.session_invites FOR SELECT 
    USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can send session invites" 
    ON public.session_invites FOR INSERT 
    WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitee can respond to session invite" 
    ON public.session_invites FOR UPDATE 
    USING (auth.uid() = invitee_id);


