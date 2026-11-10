import { z } from 'zod';

/**
 * ==============================================================================
 * Mabar Sessions & Team Splitter Schema & Type Definitions
 * Aligned with mabar-openapi.yaml (BalancedTeamResult, ParticipantRecord)
 * ==============================================================================
 */

// Zod Schema untuk validasi parameter path /api/sessions/:id/teams/split
export const splitTeamsParamsSchema = z.object({
  id: z.string().uuid({ message: 'Parameter session_id harus berupa format UUID yang valid.' })
});

export type SplitTeamsParams = z.infer<typeof splitTeamsParamsSchema>;

// Participant Record sesuai spesifikasi OpenAPI ParticipantRecord
export interface ParticipantRecord {
  id: string;
  session_id: string;
  user_id: string | null;
  is_guest: boolean;
  guest_name: string | null;
  invited_by_user_id: string | null;
  lock_as_duo: boolean;
  slot_number: number;
  assigned_team: 'Team A' | 'Team B' | null;
  skill_rating_points: number;
  full_name?: string;
  credit_score?: number;
}

// Detail Tim A / Tim B
export interface TeamDetail {
  name: 'Team A' | 'Team B';
  total_skill: number;
  average_skill: number;
  members: ParticipantRecord[];
}

// Hasil Algoritma Balanced Team Splitter (BalancedTeamResult)
export interface BalancedTeamResult {
  session_id: string;
  team_a: TeamDetail;
  team_b: TeamDetail;
  skill_difference_percent: number;
}

// Generic API Envelope Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
