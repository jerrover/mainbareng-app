import { CREDIT_SCORE_RULES, CreditScoreRuleType } from './creditCalculator';

export type ReviewAttendance = 'on_time' | 'late' | 'no_show';
export type ReviewSportsmanship = 'good' | 'okay' | 'poor';

export const SESSION_DELTA_MIN = -25;
export const SESSION_DELTA_MAX = 10;

export interface RuleDeltaEntry {
  reason: CreditScoreRuleType;
  delta: number;
}

export interface AppliedSessionDeltaResult {
  appliedEntries: RuleDeltaEntry[];
  totalAppliedDelta: number;
  nextSessionDelta: number;
  nextCreditScore: number;
  isSuspended: boolean;
}

export interface SessionParticipationMetricRow {
  session_id: string;
  attendance_status: string;
}

export interface RecomputedSessionMetrics {
  total_sessions_completed: number;
  show_up_rate: number;
}

/**
 * Menghitung daftar rule penyesuaian credit berdasarkan CREDIT_SCORE_RULES.
 * Jika attendance = 'no_show', bonus sportivitas diabaikan.
 */
export function buildReviewRuleEntries(
  attendance: ReviewAttendance,
  sportsmanship: ReviewSportsmanship
): RuleDeltaEntry[] {
  const entries: RuleDeltaEntry[] = [];

  if (attendance === 'on_time') {
    entries.push({ reason: 'ATTEND_ON_TIME', delta: CREDIT_SCORE_RULES.ATTEND_ON_TIME });
  } else if (attendance === 'late') {
    entries.push({ reason: 'LATE_ARRIVAL', delta: CREDIT_SCORE_RULES.LATE_ARRIVAL });
  } else {
    entries.push({ reason: 'NO_SHOW', delta: CREDIT_SCORE_RULES.NO_SHOW });
  }

  if (attendance !== 'no_show' && sportsmanship === 'good') {
    entries.push({
      reason: 'COMMENDED_SPORTSMANSHIP',
      delta: CREDIT_SCORE_RULES.COMMENDED_SPORTSMANSHIP
    });
  }

  return entries;
}

/**
 * Menerapkan rule delta dengan batas kumulatif sesi -25..+10 dan clamp credit score 0..100.
 */
export function applySessionCreditCap(
  currentScore: number,
  existingSessionDelta: number,
  ruleEntries: RuleDeltaEntry[]
): AppliedSessionDeltaResult {
  let runningSessionDelta = existingSessionDelta;
  let runningScore = Math.min(100, Math.max(0, currentScore));
  let totalAppliedDelta = 0;
  const appliedEntries: RuleDeltaEntry[] = [];

  for (const entry of ruleEntries) {
    const cappedTotal = Math.min(
      SESSION_DELTA_MAX,
      Math.max(SESSION_DELTA_MIN, runningSessionDelta + entry.delta)
    );
    const applied = cappedTotal - runningSessionDelta;

    if (applied !== 0) {
      runningSessionDelta = cappedTotal;
      totalAppliedDelta += applied;
      runningScore = Math.min(100, Math.max(0, runningScore + applied));
      appliedEntries.push({ reason: entry.reason, delta: applied });
    }
  }

  return {
    appliedEntries,
    totalAppliedDelta,
    nextSessionDelta: runningSessionDelta,
    nextCreditScore: runningScore,
    isSuspended: runningScore <= 50
  };
}

/**
 * Menghitung ulang total_sessions_completed dan show_up_rate dari baris peserta sesi COMPLETED non-CANCELLED.
 */
export function computeReputationSessionMetrics(
  rows: SessionParticipationMetricRow[]
): RecomputedSessionMetrics {
  const completedIds = new Set<string>();
  const attendedIds = new Set<string>();

  for (const row of rows) {
    if (row.attendance_status === 'CANCELLED') continue;
    completedIds.add(row.session_id);
    if (row.attendance_status === 'ATTENDED') {
      attendedIds.add(row.session_id);
    }
  }

  const total = completedIds.size;
  const showUpRate =
    total === 0 ? 100 : Number(((100 * attendedIds.size) / total).toFixed(2));

  return {
    total_sessions_completed: total,
    show_up_rate: showUpRate
  };
}
