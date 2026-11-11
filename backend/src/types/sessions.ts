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

// ==============================================================================
// Peer Reviews & Session Status Schemas (Wave 4: FR-09, FR-10, FR-11)
// ==============================================================================

export const sessionUuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Parameter session id harus berupa UUID yang valid.' })
});

export const reviewTargetsQuerySchema = z.object({
  reviewer_id: z.string().uuid({ message: 'Query reviewer_id harus berupa UUID yang valid.' })
});

export const peerReviewItemSchema = z.object({
  target_participant_id: z
    .string()
    .uuid({ message: 'target_participant_id harus berupa UUID yang valid.' }),
  attendance: z.enum(['on_time', 'late', 'no_show']),
  sportsmanship: z.enum(['good', 'okay', 'poor']),
  level_fit: z.enum(['lower', 'accurate', 'higher']),
  notes: z.string().max(500).nullable().optional(),
  is_guest: z.boolean().optional().default(false)
});

export const submitPeerReviewsSchema = z.object({
  reviewer_id: z.string().uuid({ message: 'reviewer_id harus berupa UUID yang valid.' }),
  reviews: z
    .array(peerReviewItemSchema)
    .min(1, { message: 'Daftar reviews minimal berisi 1 item.' })
});

export type SessionLifecycleStatus = 'OPEN' | 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TargetSessionStatus = 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const ALLOWED_SESSION_STATUS_TRANSITIONS: Record<SessionLifecycleStatus, TargetSessionStatus[]> = {
  OPEN: ['LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  LOCKED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

export const updateSessionStatusSchema = z.object({
  host_id: z.string().uuid({ message: 'host_id harus berupa UUID yang valid.' }),
  status: z.enum(['LOCKED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
});

export interface ReviewTargetItem {
  participant_id: string;
  display_name: string;
  is_guest: boolean;
  assigned_team: 'Team A' | 'Team B' | null;
}

export interface SkippedGuestItem {
  target_participant_id: string;
  reason: string;
}

export interface PeerReviewResultItem {
  review_id: string;
  target_participant_id: string;
  target_user_id: string;
  delta_applied: number;
  credit_score_after: number;
  is_suspended: boolean;
  attendance_status: 'ATTENDED' | 'NO_SHOW';
  total_sessions_completed: number;
  show_up_rate: number;
}

export interface SubmitPeerReviewsData {
  session_id: string;
  reviewer_id: string;
  submitted_count: number;
  skipped_guests: SkippedGuestItem[];
  results: PeerReviewResultItem[];
}

