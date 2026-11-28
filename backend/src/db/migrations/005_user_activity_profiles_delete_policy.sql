-- ==============================================================================
-- Migration: 005_user_activity_profiles_delete_policy.sql
-- Allow authenticated users to delete their own sport/esport activity profile
-- ==============================================================================

DROP POLICY IF EXISTS "Users can delete own activity profile" ON public.user_activity_profiles;
CREATE POLICY "Users can delete own activity profile"
    ON public.user_activity_profiles FOR DELETE
    USING (auth.uid() = user_id);
