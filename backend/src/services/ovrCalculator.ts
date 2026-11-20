/**
 * Service: ovrCalculator.ts
 * Module: Player OVR (Overall Rating) & 5-Axis Radar Profiling
 * 
 * Sumbu Radar Chart (Skala 0 - 100):
 * 1. TEAMWORK (TMW)    - Kerjasama tim, unselfish, komunikasi
 * 2. FAIR PLAY (FRP)   - Sportivitas, ramah, kepatuhan aturan
 * 3. RELIABILITY (REL) - Integritas kehadiran & komitmen (Credit Score)
 * 4. EXPERIENCE (EXP)  - Jam terbang & total sesi tuntas di Mabar
 * 5. SKILL FIT (SKL)   - Tingkat kemahiran & kalibrasi kesesuaian level
 * 
 * Total OVR: Clamped antara 50 s/d 99.
 * Grade Tier:
 * - 90 - 99: 'S' (Elite / MVP)
 * - 80 - 89: 'A' (Reliable Veteran)
 * - 70 - 79: 'B' (Active Standard / Baseline Baru)
 * - 60 - 69: 'C' (Warning / Inconsistent)
 * - < 60   : 'D' (Restricted / Cooldown)
 */

export type OvrGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export type OvrDimensionKey =
  | 'teamwork'
  | 'fair_play'
  | 'reliability'
  | 'experience'
  | 'skill_fit';

export interface OvrRadarItem {
  key: OvrDimensionKey;
  label: string;
  name: string;
  value: number; // 0 - 100
}

export interface PeerReviewInput {
  attendance: 'on_time' | 'late' | 'no_show';
  sportsmanship: 'good' | 'okay' | 'poor';
  level_fit: 'lower' | 'accurate' | 'higher';
  notes?: string | null;
}

export interface ProfileStatsInput {
  credit_score: number;
  total_sessions_completed: number;
  show_up_rate?: number;
}

export interface ActivityProfileInput {
  activity_type?: string;
  skill_rating_level?: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  skill_rating_points?: number;
}

export interface OvrProfileResult {
  ovr: number;
  grade: OvrGrade;
  is_calibrated: boolean;
  matches_played: number;
  total_reviews: number;
  radar: OvrRadarItem[];
}

// Bobot kontribusi tiap sumbu ke total OVR
export const OVR_WEIGHTS = {
  teamwork: 0.25,
  fair_play: 0.25,
  reliability: 0.20,
  experience: 0.15,
  skill_fit: 0.15,
} as const;

export const OVR_MIN = 50;
export const OVR_MAX = 99;
export const MIN_CALIBRATION_MATCHES = 3;

/**
 * Normalisasi nilai ke rentang [min, max]
 */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 1. TEAMWORK (TMW): Kerjasama & kekompakan
 * Berbasis sportsmanship yang baik dan kehadiran tepat waktu.
 */
export function computeTeamwork(reviews: PeerReviewInput[]): number {
  if (reviews.length === 0) {
    return 75; // Baseline pemain baru
  }

  let totalScore = 0;
  for (const r of reviews) {
    if (r.attendance === 'no_show') {
      totalScore += 0;
    } else if (r.sportsmanship === 'good') {
      totalScore += 100;
    } else if (r.sportsmanship === 'okay') {
      totalScore += 70;
    } else {
      totalScore += 25;
    }
  }

  return clamp(Math.round(totalScore / reviews.length), 0, 100);
}

/**
 * 2. FAIR PLAY (FRP): Sportivitas & kepatuhan aturan
 * good = 100, okay = 65, poor = 20
 */
export function computeFairPlay(reviews: PeerReviewInput[]): number {
  if (reviews.length === 0) {
    return 80; // Baseline pemain baru
  }

  let totalPoints = 0;
  for (const r of reviews) {
    if (r.sportsmanship === 'good') {
      totalPoints += 100;
    } else if (r.sportsmanship === 'okay') {
      totalPoints += 65;
    } else {
      totalPoints += 20;
    }
  }

  return clamp(Math.round(totalPoints / reviews.length), 0, 100);
}

/**
 * 3. RELIABILITY (REL): Komitmen kehadiran & ketiadaan ghosting
 * Langsung terikat pada credit_score (0 - 100, default 100)
 */
export function computeReliability(creditScore: number): number {
  return clamp(creditScore, 0, 100);
}

/**
 * 4. EXPERIENCE (EXP): Jam terbang di Mabar
 * Kurva akar kuadrat: 0 match = 30, 4 match = 61, 9 match = 77, 16 match = 93, 20+ match = 100
 */
export function computeExperience(totalCompleted: number): number {
  if (totalCompleted <= 0) return 30;
  const scaled = 30 + Math.sqrt(totalCompleted) * 15.65;
  return clamp(Math.round(scaled), 0, 100);
}

/**
 * 5. SKILL FIT (SKL): Kecocokan level bermain & kemahiran
 * Base rating points 1200 -> 75 poin. Disesuaikan upvote/downvote level_fit teman.
 */
export function computeSkillFit(
  activities: ActivityProfileInput[] = [],
  reviews: PeerReviewInput[] = []
): number {
  // Ambil rata-rata poin skill jika ada
  let basePoints = 1200;
  if (activities.length > 0) {
    const validPoints = activities
      .map((a) => a.skill_rating_points)
      .filter((p): p is number => typeof p === 'number' && !isNaN(p));
    if (validPoints.length > 0) {
      basePoints = validPoints.reduce((sum, p) => sum + p, 0) / validPoints.length;
    }
  }

  // Normalisasi 1200 pts -> 75
  let baseScore = clamp(Math.round((basePoints / 1600) * 100), 50, 95);

  // Penyesuaian peer review level_fit jika ada
  if (reviews.length > 0) {
    let delta = 0;
    for (const r of reviews) {
      if (r.level_fit === 'higher') delta += 3;
      else if (r.level_fit === 'lower') delta -= 4;
    }
    const avgDelta = delta / reviews.length;
    baseScore = clamp(Math.round(baseScore + avgDelta), 0, 100);
  }

  return baseScore;
}

/**
 * Menghitung Grade OVR (S, A, B, C, D)
 */
export function getOvrGrade(ovr: number): OvrGrade {
  if (ovr >= 90) return 'S';
  if (ovr >= 80) return 'A';
  if (ovr >= 70) return 'B';
  if (ovr >= 60) return 'C';
  return 'D';
}

/**
 * Fungsi Utama: Menghitung profil OVR lengkap beserta 5 sumbu radar chart
 */
export function calculateOvrProfile(
  profile: ProfileStatsInput,
  reviews: PeerReviewInput[] = [],
  activities: ActivityProfileInput[] = []
): OvrProfileResult {
  const matchesPlayed = profile.total_sessions_completed || 0;
  const isCalibrated = matchesPlayed >= MIN_CALIBRATION_MATCHES;

  const teamwork = computeTeamwork(reviews);
  const fairPlay = computeFairPlay(reviews);
  const reliability = computeReliability(profile.credit_score ?? 100);
  const experience = computeExperience(matchesPlayed);
  const skillFit = computeSkillFit(activities, reviews);

  const rawScore =
    teamwork * OVR_WEIGHTS.teamwork +
    fairPlay * OVR_WEIGHTS.fair_play +
    reliability * OVR_WEIGHTS.reliability +
    experience * OVR_WEIGHTS.experience +
    skillFit * OVR_WEIGHTS.skill_fit;

  const finalOvr = clamp(Math.round(rawScore), OVR_MIN, OVR_MAX);
  const grade = getOvrGrade(finalOvr);

  return {
    ovr: finalOvr,
    grade,
    is_calibrated: isCalibrated,
    matches_played: matchesPlayed,
    total_reviews: reviews.length,
    radar: [
      { key: 'teamwork', label: 'TMW', name: 'Teamwork', value: teamwork },
      { key: 'fair_play', label: 'FRP', name: 'Fair Play', value: fairPlay },
      { key: 'reliability', label: 'REL', name: 'Reliability', value: reliability },
      { key: 'experience', label: 'EXP', name: 'Experience', value: experience },
      { key: 'skill_fit', label: 'SKL', name: 'Skill Fit', value: skillFit },
    ],
  };
}
