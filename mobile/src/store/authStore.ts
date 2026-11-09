import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false
    }),
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthStore] Error signing out:', err);
    } finally {
      set({ session: null, user: null, isLoading: false });
    }
  }
}));
