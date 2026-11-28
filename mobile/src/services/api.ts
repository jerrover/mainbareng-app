import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://mainbareng-app.vercel.app';

export interface ApiProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  credit_score: number;
  total_sessions_completed: number;
  show_up_rate: number;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiOvrRadarItem {
  key: string;
  label: string;
  name: string;
  value: number;
}

export interface ApiOvrProfile {
  ovr: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  is_calibrated: boolean;
  matches_played: number;
  total_reviews: number;
  radar: ApiOvrRadarItem[];
}

export interface ApiCreditTransaction {
  id: string;
  user_id: string;
  session_id: string | null;
  delta: number;
  reason: string;
  balance_after: number | null;
  created_at: string;
}

export interface ApiAnonymousReview {
  id: string;
  session_id: string;
  attendance: ReviewAttendance;
  sportsmanship: ReviewSportsmanship;
  level_fit: ReviewLevelFit | null;
  notes: string | null;
  created_at: string;
}

export interface ApiActivityProfile {
  activity_type: string;
  in_game_name: string | null;
  game_id_tag: string | null;
  preferred_role: string | null;
  skill_rating_level: 'Beginner' | 'Intermediate' | 'Advanced';
  skill_rating_points: number;
}

export interface ApiVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  category: 'sports' | 'esports';
  supported_activities: string[];
  rate_hourly_min: number;
  rate_hourly_max: number;
  contact_whatsapp: string;
  maps_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSession {
  id: string;
  host_id: string;
  title: string;
  activity_type: string;
  session_category: 'sports' | 'esports';
  session_mode: 'play_now' | 'scheduled';
  status: 'OPEN' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  venue_id: string | null;
  custom_location: string | null;
  start_time: string;
  duration_minutes: number;
  end_time: string | null;
  max_slots: number;
  min_credit_score: number;
  required_skill_level: string | null;
  team_format: '2_teams' | 'free_for_all';
  estimated_cost_total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name?: string;
    credit_score?: number;
  } | null;
  venues?: {
    name?: string;
    address?: string;
    maps_url?: string | null;
  } | null;
}

export interface CreateSessionPayload {
  host_id: string;
  title: string;
  activity_type: string;
  session_category?: 'sports' | 'esports';
  session_mode?: 'play_now' | 'scheduled';
  venue_id?: string | null;
  custom_location?: string | null;
  start_time: string;
  duration_minutes?: number;
  max_slots: number;
  min_credit_score?: number;
  team_format?: '2_teams' | 'free_for_all';
  estimated_cost_total?: number;
}

// --- Peer review (Wave 4) ---

export interface ApiReviewTarget {
  participant_id: string;
  display_name: string;
  is_guest: boolean;
  assigned_team: 'Team A' | 'Team B' | null;
}

export type ReviewAttendance = 'on_time' | 'late' | 'no_show';
export type ReviewSportsmanship = 'good' | 'okay' | 'poor';
export type ReviewLevelFit = 'lower' | 'accurate' | 'higher';

export interface SubmitReviewItem {
  target_participant_id: string;
  attendance: ReviewAttendance;
  sportsmanship: ReviewSportsmanship;
  level_fit: ReviewLevelFit;
  notes?: string | null;
  is_guest?: boolean;
}

export interface SubmitReviewsResult {
  session_id: string;
  reviewer_id: string;
  submitted_count: number;
  skipped_guests: string[];
  results: Array<{
    review_id: string;
    target_participant_id: string;
    target_user_id: string;
    delta_applied: number;
    credit_score_after: number;
    is_suspended: boolean;
    attendance_status: string;
    total_sessions_completed: number;
    show_up_rate: number;
  }>;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export const api = {
  baseUrl: BASE_URL,

  async getSessions(params?: { category?: string; mode?: string }): Promise<ApiSession[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.mode) query.append('mode', params.mode);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/api/sessions${qs}`);
    if (!res.ok) {
      throw new Error(`Gagal mengambil sesi mabar: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data || [];
  },

  async getVenues(params?: { category?: string }): Promise<ApiVenue[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${BASE_URL}/api/venues${qs}`);
    if (!res.ok) {
      throw new Error(`Gagal mengambil data venue: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data || [];
  },

  async createSession(payload: CreateSessionPayload): Promise<ApiSession> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal membuat sesi');
    }
    return json.data;
  },

  async joinSession(sessionId: string, userId: string): Promise<{ slot_number: number; session_locked: boolean }> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/sessions/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ session_id: sessionId, user_id: userId })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal bergabung ke sesi');
    }
    return json;
  },

  async leaveSession(
    sessionId: string,
    userId: string,
    reason?: string
  ): Promise<{ released_slot: number; session_reopened: boolean; remaining_participants: number }> {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`${BASE_URL}/api/sessions/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ session_id: sessionId, user_id: userId, reason })
      });

      let json: any = null;
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (res.ok && json?.success) {
        return json;
      }

      // Jika endpoint Vercel 404 (karena backend baru di local branch & belum dideploy ke live Vercel),
      // jalankan fallback update partisipasi langsung lewat client Supabase (didukung RLS policy):
      if (res.status === 404 || !res.ok) {
        console.warn(`[api.leaveSession] Server status ${res.status}, executing direct Supabase fallback...`);
        const { data: partData, error: partErr } = await supabase
          .from('session_participants')
          .update({
            attendance_status: 'CANCELLED',
            cancelled_at: new Date().toISOString(),
            assigned_team: null
          })
          .match({ session_id: sessionId, user_id: userId })
          .select('slot_number')
          .maybeSingle();

        if (partErr) {
          throw new Error(partErr.message || 'Gagal membatalkan slot sesi di database.');
        }

        // Cek sisa peserta aktif untuk auto-unlock sesi dari LOCKED -> OPEN
        const { count: activeCount } = await supabase
          .from('session_participants')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .neq('attendance_status', 'CANCELLED');

        await supabase
          .from('sessions')
          .update({ status: 'OPEN', updated_at: new Date().toISOString() })
          .match({ id: sessionId, status: 'LOCKED' });

        return {
          released_slot: partData?.slot_number || 1,
          session_reopened: true,
          remaining_participants: activeCount || 0
        };
      }

      throw new Error(json?.message || json?.error || `Gagal membatalkan slot: HTTP ${res.status}`);
    } catch (err: any) {
      throw new Error(err.message || 'Gagal membatalkan slot sesi.');
    }
  },

  async updateSessionStatus(
    sessionId: string,
    hostId: string,
    status: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  ): Promise<ApiSession> {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ host_id: hostId, status })
      });

      let json: any = null;
      try {
        const text = await res.text();
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (res.ok && json?.success) {
        return json.data;
      }

      if (res.status === 404 || !res.ok) {
        console.warn(`[api.updateSessionStatus] Server status ${res.status}, executing direct Supabase fallback...`);
        const { data: updatedSession, error: updateErr } = await supabase
          .from('sessions')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .match({ id: sessionId, host_id: hostId })
          .select()
          .single();

        if (updateErr) throw new Error(updateErr.message || 'Gagal mengubah status sesi di database.');

        if (status === 'CANCELLED') {
          await supabase
            .from('session_participants')
            .update({
              attendance_status: 'CANCELLED',
              cancelled_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .neq('attendance_status', 'CANCELLED');
        }

        return updatedSession as any;
      }

      throw new Error(json?.error || json?.message || `Gagal memperbarui status sesi (${res.status})`);
    } catch (err: any) {
      throw new Error(err.message || 'Gagal memperbarui status sesi');
    }
  },

  async getMyProfile(): Promise<ApiProfile | null> {
    try {
      const authHeaders = await getAuthHeader();
      if (!authHeaders.Authorization) return null;
      const res = await fetch(`${BASE_URL}/api/profile/me`, {
        headers: authHeaders
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.profile || null;
    } catch {
      return null;
    }
  },

  async getSession(id: string): Promise<ApiSession> {
    const res = await fetch(`${BASE_URL}/api/sessions/${id}`);
    if (!res.ok) {
      throw new Error(`Gagal mengambil detail sesi: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data;
  },

  async splitTeams(sessionId: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/teams/split`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal membagi tim');
    }
    return json.data;
  },

  async getReviewTargets(sessionId: string, reviewerId: string): Promise<ApiReviewTarget[]> {
    const authHeaders = await getAuthHeader();
    const query = new URLSearchParams({ reviewer_id: reviewerId });
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/review-targets?${query.toString()}`, {
      headers: {
        ...authHeaders
      }
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal memuat daftar peserta yang bisa dinilai');
    }
    return json.data || [];
  },

  async submitReviews(
    sessionId: string,
    reviewerId: string,
    reviews: SubmitReviewItem[]
  ): Promise<SubmitReviewsResult> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ reviewer_id: reviewerId, reviews })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal mengirim penilaian');
    }
    return json.data;
  },

  async getMyOvr(): Promise<ApiOvrProfile | null> {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`${BASE_URL}/api/profile/me/ovr`, {
        headers: authHeaders
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.ovr_profile || null;
    } catch {
      return null;
    }
  },

  async getPlayerOvr(userId: string): Promise<ApiOvrProfile | null> {
    try {
      const authHeaders = await getAuthHeader();
      const res = await fetch(`${BASE_URL}/api/profile/${userId}/ovr`, {
        headers: authHeaders
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.ovr_profile || null;
    } catch {
      return null;
    }
  },

  async getCreditHistory(): Promise<ApiCreditTransaction[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/profile/me/credit-history`, {
      headers: authHeaders
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal memuat riwayat Credit Score');
    }
    return json.transactions || [];
  },

  async getMyReviews(): Promise<ApiAnonymousReview[]> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/profile/me/reviews`, {
      headers: authHeaders
    });
    if (res.status === 404) {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('peer_reviews')
        .select('id, session_id, attendance, sportsmanship, level_fit, notes, created_at')
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return (data as ApiAnonymousReview[]) || [];
    }
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal memuat ulasan teman');
    }
    return json.reviews || [];
  },

  async upsertActivityProfile(payload: {
    activity_type: string;
    preferred_role?: string | null;
    skill_rating_level: 'Beginner' | 'Intermediate' | 'Advanced';
    in_game_name?: string | null;
    game_id_tag?: string | null;
  }): Promise<ApiActivityProfile> {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`${BASE_URL}/api/profile/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal menyimpan profil cabang olahraga');
    }
    return json.activity;
  },

  async deleteActivityProfile(activityType: string): Promise<void> {
    const normalized = activityType.toLowerCase().trim();
    const authHeaders = await getAuthHeader();
    const res = await fetch(
      `${BASE_URL}/api/profile/activities/${encodeURIComponent(normalized)}`,
      {
        method: 'DELETE',
        headers: authHeaders
      }
    );
    if (res.status === 404) {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi login tidak ditemukan');
      const { data: deletedRows, error } = await supabase
        .from('user_activity_profiles')
        .delete()
        .match({ user_id: user.id, activity_type: normalized })
        .select('id');
      if (error) throw new Error(error.message);
      if (!deletedRows || deletedRows.length === 0) {
        throw new Error(
          'Hapus cabor butuh policy DELETE di Supabase atau deploy endpoint backend DELETE /api/profile/activities.'
        );
      }
      return;
    }
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Gagal menghapus profil cabang olahraga');
    }
  }
};
