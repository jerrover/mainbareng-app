-- ==============================================================================
-- Migration: 002_friendships_and_invites.sql
-- Module: FR-17 Friends & Session Invites (Social Graph & Lobby Coordination)
-- Target: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. Friendships Table (Stateful M:N Relationship)
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

-- 2. Session Invites Table (Polyadic Junction: Session + Inviter + Invitee)
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

-- 3. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_session_id ON public.session_invites(session_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_invitee_id ON public.session_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_session_invites_inviter_id ON public.session_invites(inviter_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_invites ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Friendships
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

-- 6. RLS Policies for Session Invites
CREATE POLICY "Users can view own session invites" 
    ON public.session_invites FOR SELECT 
    USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can send session invites" 
    ON public.session_invites FOR INSERT 
    WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitee can respond to session invite" 
    ON public.session_invites FOR UPDATE 
    USING (auth.uid() = invitee_id);
