import {
  calculateOvrProfile,
  computeTeamwork,
  computeFairPlay,
  computeReliability,
  computeExperience,
  computeSkillFit,
  getOvrGrade,
  OVR_MIN,
  OVR_MAX,
  MIN_CALIBRATION_MATCHES,
} from '../src/services/ovrCalculator';

describe('Player OVR & Radar Profiling Service', () => {
  describe('Dimension Calculations', () => {
    it('computeTeamwork: returns 75 for newcomer (0 reviews)', () => {
      expect(computeTeamwork([])).toBe(75);
    });

    it('computeTeamwork: penalizes no_show and rewards good sportsmanship', () => {
      const reviews = [
        { attendance: 'on_time' as const, sportsmanship: 'good' as const, level_fit: 'accurate' as const },
        { attendance: 'no_show' as const, sportsmanship: 'poor' as const, level_fit: 'accurate' as const },
      ];
      // (100 + 0) / 2 = 50
      expect(computeTeamwork(reviews)).toBe(50);
    });

    it('computeFairPlay: correctly weights good, okay, and poor sportsmanship', () => {
      expect(computeFairPlay([])).toBe(80);

      const reviews = [
        { attendance: 'on_time' as const, sportsmanship: 'good' as const, level_fit: 'accurate' as const }, // 100
        { attendance: 'on_time' as const, sportsmanship: 'okay' as const, level_fit: 'accurate' as const }, // 65
        { attendance: 'on_time' as const, sportsmanship: 'poor' as const, level_fit: 'accurate' as const }, // 20
      ];
      // (100 + 65 + 20) / 3 = 185 / 3 = 61.67 -> 62
      expect(computeFairPlay(reviews)).toBe(62);
    });

    it('computeReliability: mirrors credit score within [0, 100]', () => {
      expect(computeReliability(100)).toBe(100);
      expect(computeReliability(70)).toBe(70);
      expect(computeReliability(120)).toBe(100);
      expect(computeReliability(-10)).toBe(0);
    });

    it('computeExperience: applies square root scaling with base 30', () => {
      expect(computeExperience(0)).toBe(30);
      expect(computeExperience(4)).toBe(61); // 30 + 2 * 15.65 = 61.3 -> 61
      expect(computeExperience(9)).toBe(77); // 30 + 3 * 15.65 = 76.95 -> 77
      expect(computeExperience(25)).toBe(100); // capped at 100
    });

    it('computeSkillFit: adjusts based on peer review level_fit', () => {
      // default points 1200 -> base (1200 / 1600) * 100 = 75
      expect(computeSkillFit([], [])).toBe(75);

      const reviews = [
        { attendance: 'on_time' as const, sportsmanship: 'good' as const, level_fit: 'higher' as const }, // +3
        { attendance: 'on_time' as const, sportsmanship: 'good' as const, level_fit: 'higher' as const }, // +3
      ];
      // 75 + 3 = 78
      expect(computeSkillFit([], reviews)).toBe(78);
    });
  });

  describe('Grade Classification', () => {
    it('correctly maps OVR ranges to grades S, A, B, C, D', () => {
      expect(getOvrGrade(95)).toBe('S');
      expect(getOvrGrade(90)).toBe('S');
      expect(getOvrGrade(89)).toBe('A');
      expect(getOvrGrade(80)).toBe('A');
      expect(getOvrGrade(79)).toBe('B');
      expect(getOvrGrade(70)).toBe('B');
      expect(getOvrGrade(69)).toBe('C');
      expect(getOvrGrade(60)).toBe('C');
      expect(getOvrGrade(59)).toBe('D');
      expect(getOvrGrade(50)).toBe('D');
    });
  });

  describe('Full calculateOvrProfile', () => {
    it('handles Cold Start user (< 3 matches)', () => {
      const res = calculateOvrProfile(
        { credit_score: 100, total_sessions_completed: 0 },
        [],
        []
      );

      expect(res.is_calibrated).toBe(false);
      expect(res.matches_played).toBe(0);
      expect(res.total_reviews).toBe(0);
      expect(res.radar).toHaveLength(5);
      // Raw: 0.25(75) + 0.25(80) + 0.20(100) + 0.15(30) + 0.15(75) = 18.75 + 20 + 20 + 4.5 + 11.25 = 74.5 -> 75
      expect(res.ovr).toBe(75);
      expect(res.grade).toBe('B');
    });

    it('calculates calibrated profile for active veteran player', () => {
      const reviews = Array.from({ length: 10 }, () => ({
        attendance: 'on_time' as const,
        sportsmanship: 'good' as const,
        level_fit: 'accurate' as const,
      }));

      const res = calculateOvrProfile(
        { credit_score: 100, total_sessions_completed: 16 },
        reviews,
        [{ skill_rating_points: 1400 }]
      );

      expect(res.is_calibrated).toBe(true);
      expect(res.matches_played).toBe(16);
      expect(res.ovr).toBeGreaterThanOrEqual(90);
      expect(res.grade).toBe('S');
      expect(res.radar.find((r) => r.key === 'reliability')?.value).toBe(100);
    });

    it('clamps toxic / poor reliability player to minimum boundary', () => {
      const poorReviews = Array.from({ length: 5 }, () => ({
        attendance: 'no_show' as const,
        sportsmanship: 'poor' as const,
        level_fit: 'lower' as const,
      }));

      const res = calculateOvrProfile(
        { credit_score: 0, total_sessions_completed: 5 },
        poorReviews,
        [{ skill_rating_points: 800 }]
      );

      expect(res.is_calibrated).toBe(true);
      expect(res.ovr).toBeGreaterThanOrEqual(OVR_MIN);
      expect(res.ovr).toBeLessThanOrEqual(60);
      expect(['C', 'D']).toContain(res.grade);
    });

    it('never exceeds OVR_MAX (99)', () => {
      const perfectReviews = Array.from({ length: 20 }, () => ({
        attendance: 'on_time' as const,
        sportsmanship: 'good' as const,
        level_fit: 'higher' as const,
      }));

      const res = calculateOvrProfile(
        { credit_score: 100, total_sessions_completed: 100 },
        perfectReviews,
        [{ skill_rating_points: 2500 }]
      );

      expect(res.ovr).toBeLessThanOrEqual(OVR_MAX);
    });
  });
});
