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
  }
};
