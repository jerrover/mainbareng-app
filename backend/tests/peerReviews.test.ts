import app from '../src/index';
import { supabase } from '../src/db/supabase';
import { KARMA_RULES } from '../src/services/karmaCalculator';
import {
  applySessionCreditCap,
  buildReviewRuleEntries,
  computeReputationSessionMetrics
} from '../src/services/peerReviewCalculator';

jest.mock('../src/db/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn(),
      auth: {
        getUser: jest.fn()
      }
    }
  };
});

const SESSION_ID = '11111111-1111-4111-8111-111111111111';
const HOST_ID = '22222222-2222-4222-8222-222222222222';
const REVIEWER_ID = '33333333-3333-4333-8333-333333333333';
const TARGET_USER_ID = '44444444-4444-4444-8444-444444444444';
const PART_REVIEWER_ID = '55555555-5555-4555-8555-555555555555';
const PART_TARGET_ID = '66666666-6666-4666-8666-666666666666';
const GUEST_PART_ID = '77777777-7777-4777-8777-777777777777';

function createQueryBuilder(result: any) {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject)
  };
  return builder;
}

describe('Wave 4: Peer Reviews, Credit Mutation, Credit History & Session Status', () => {
  const mockFrom = supabase.from as jest.Mock;
  const mockRpc = supabase.rpc as jest.Mock;
  const mockGetUser = supabase.auth.getUser as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // 1. GET /api/sessions/:id/review-targets
  // ============================================================================
  describe('GET /api/sessions/:id/review-targets', () => {
    it('should return 200 with targets excluding reviewer and cancelled participants', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return createQueryBuilder({
            data: { id: SESSION_ID, status: 'COMPLETED' },
            error: null
          });
        }
        if (table === 'session_participants') {
          return createQueryBuilder({
            data: [
              {
                id: PART_REVIEWER_ID,
                user_id: REVIEWER_ID,
                assigned_team: 'Team A',
                attendance_status: 'CONFIRMED',
                profiles: { id: REVIEWER_ID, full_name: 'Jerikho' }
              },
              {
                id: PART_TARGET_ID,
                user_id: TARGET_USER_ID,
                assigned_team: 'Team B',
                attendance_status: 'CONFIRMED',
                profiles: { id: TARGET_USER_ID, full_name: 'Hyun' }
              }
            ],
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(
        `/api/sessions/${SESSION_ID}/review-targets?reviewer_id=${REVIEWER_ID}`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual([
        {
          participant_id: PART_TARGET_ID,
          display_name: 'Hyun',
          is_guest: false,
          assigned_team: 'Team B'
        }
      ]);
    });

    it('should return 400 when session status is not COMPLETED', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return createQueryBuilder({
            data: { id: SESSION_ID, status: 'OPEN' },
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(
        `/api/sessions/${SESSION_ID}/review-targets?reviewer_id=${REVIEWER_ID}`
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('COMPLETED');
    });

    it('should return 403 when reviewer_id is not an active participant of the session', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return createQueryBuilder({
            data: { id: SESSION_ID, status: 'COMPLETED' },
            error: null
          });
        }
        if (table === 'session_participants') {
          return createQueryBuilder({
            data: [
              {
                id: PART_TARGET_ID,
                user_id: TARGET_USER_ID,
                assigned_team: 'Team B',
                attendance_status: 'CONFIRMED',
                profiles: { id: TARGET_USER_ID, full_name: 'Hyun' }
              }
            ],
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(
        `/api/sessions/${SESSION_ID}/review-targets?reviewer_id=${REVIEWER_ID}`
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });

  // ============================================================================
  // 2. POST /api/sessions/:id/reviews + KARMA_RULES delta & cap unit tests
  // ============================================================================
  describe('POST /api/sessions/:id/reviews', () => {
    it('should return 201 on successful atomic peer review submission', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: true,
          session_id: SESSION_ID,
          reviewer_id: REVIEWER_ID,
          submitted_count: 1,
          skipped_guests: [],
          results: [
            {
              review_id: '88888888-8888-4888-8888-888888888888',
              target_participant_id: PART_TARGET_ID,
              target_user_id: TARGET_USER_ID,
              delta_applied: 7,
              credit_score_after: 100,
              is_suspended: false,
              attendance_status: 'ATTENDED',
              total_sessions_completed: 1,
              show_up_rate: 100
            }
          ]
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: PART_TARGET_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              notes: 'Main rapi',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.submitted_count).toBe(1);
      expect(body.data.results[0].delta_applied).toBe(7);
      expect(mockRpc).toHaveBeenCalledWith('submit_peer_reviews_atomic', {
        p_session_id: SESSION_ID,
        p_reviewer_id: REVIEWER_ID,
        p_reviews: [
          {
            target_participant_id: PART_TARGET_ID,
            attendance: 'on_time',
            sportsmanship: 'good',
            level_fit: 'accurate',
            notes: 'Main rapi',
            is_guest: false
          }
        ]
      });
    });

    it('should skip guest items and include them in skipped_guests with 201', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: true,
          session_id: SESSION_ID,
          reviewer_id: REVIEWER_ID,
          submitted_count: 1,
          skipped_guests: [
            {
              target_participant_id: GUEST_PART_ID,
              reason: 'Guest participant dilewati karena skema tabel guest belum tersedia.'
            }
          ],
          results: [
            {
              review_id: '88888888-8888-4888-8888-888888888888',
              target_participant_id: PART_TARGET_ID,
              target_user_id: TARGET_USER_ID,
              delta_applied: 2,
              credit_score_after: 92,
              is_suspended: false,
              attendance_status: 'ATTENDED',
              total_sessions_completed: 2,
              show_up_rate: 100
            }
          ]
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: GUEST_PART_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              is_guest: true
            },
            {
              target_participant_id: PART_TARGET_ID,
              attendance: 'on_time',
              sportsmanship: 'okay',
              level_fit: 'accurate',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.submitted_count).toBe(1);
      expect(body.data.skipped_guests).toHaveLength(1);
      expect(body.data.skipped_guests[0].target_participant_id).toBe(GUEST_PART_ID);
    });

    it('should return 400 on self-review', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: false,
          code: 'SELF_REVIEW',
          message: 'Reviewer tidak dapat memberikan review untuk dirinya sendiri.'
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: PART_REVIEWER_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('dirinya sendiri');
    });

    it('should return 409 on duplicate review (UNIQUE violation)', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: false,
          code: 'DUPLICATE_REVIEW',
          message: 'Review duplikat: Anda sudah pernah menilai peserta ini pada sesi yang sama.'
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: PART_TARGET_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('duplikat');
    });

    it('should return 400 when session status is not COMPLETED on POST reviews', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: false,
          code: 'INVALID_STATUS',
          message: 'Peer review hanya dapat dikirim untuk sesi berstatus COMPLETED.'
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: PART_TARGET_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('should return 403 when reviewer is not a participant on POST reviews', async () => {
      mockRpc.mockResolvedValue({
        data: {
          ok: false,
          code: 'NOT_PARTICIPANT',
          message: 'Reviewer bukan peserta aktif pada sesi ini.'
        },
        error: null
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: REVIEWER_ID,
          reviews: [
            {
              target_participant_id: PART_TARGET_ID,
              attendance: 'on_time',
              sportsmanship: 'good',
              level_fit: 'accurate',
              is_guest: false
            }
          ]
        })
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('should ignore sportsmanship good bonus when attendance is no_show and enforce -25..+10 cumulative cap', () => {
      // no_show + good must ignore COMMENDED_SPORTSMANSHIP (+5)
      const noShowEntries = buildReviewRuleEntries('no_show', 'good');
      expect(noShowEntries).toEqual([
        { reason: 'NO_SHOW', delta: KARMA_RULES.NO_SHOW }
      ]);

      // poor sportsmanship yields 0 extra penalty beyond attendance rule
      const poorEntries = buildReviewRuleEntries('on_time', 'poor');
      expect(poorEntries).toEqual([
        { reason: 'ATTEND_ON_TIME', delta: KARMA_RULES.ATTEND_ON_TIME }
      ]);

      // Positive cumulative cap +10 across reviewers: existing +7 + (+2 +5) => only +3 applied
      const positiveEntries = buildReviewRuleEntries('on_time', 'good');
      const cappedPos = applySessionCreditCap(85, 7, positiveEntries);
      expect(cappedPos.totalAppliedDelta).toBe(3);
      expect(cappedPos.nextSessionDelta).toBe(10);
      expect(cappedPos.nextCreditScore).toBe(88);
      expect(cappedPos.appliedEntries).toEqual([
        { reason: 'ATTEND_ON_TIME', delta: 2 },
        { reason: 'COMMENDED_SPORTSMANSHIP', delta: 1 }
      ]);

      // Negative cumulative cap -25 across reviewers: existing -20 + (-20) => only -5 applied, triggers suspend <= 50
      const cappedNeg = applySessionCreditCap(55, -20, noShowEntries);
      expect(cappedNeg.totalAppliedDelta).toBe(-5);
      expect(cappedNeg.nextSessionDelta).toBe(-25);
      expect(cappedNeg.nextCreditScore).toBe(50);
      expect(cappedNeg.isSuspended).toBe(true);
    });
  });

  // ============================================================================
  // 3. GET /api/profile/me/credit-history
  // ============================================================================
  describe('GET /api/profile/me/credit-history', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await app.request('/api/profile/me/credit-history');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('should return 200 with credit transactions ordered by created_at desc', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: TARGET_USER_ID, email: 'hyun@student.umn.ac.id' } },
        error: null
      });

      const txRows = [
        {
          id: 'tx-2',
          user_id: TARGET_USER_ID,
          session_id: SESSION_ID,
          delta: 5,
          reason: 'COMMENDED_SPORTSMANSHIP',
          balance_after: 97,
          created_at: '2026-11-11T10:05:00Z'
        },
        {
          id: 'tx-1',
          user_id: TARGET_USER_ID,
          session_id: SESSION_ID,
          delta: 2,
          reason: 'ATTEND_ON_TIME',
          balance_after: 92,
          created_at: '2026-11-11T10:00:00Z'
        }
      ];

      const txBuilder = createQueryBuilder({ data: txRows, error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'credit_transactions') return txBuilder;
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request('/api/profile/me/credit-history', {
        headers: { Authorization: 'Bearer valid-jwt-token' }
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.transactions).toEqual(txRows);
      expect(txBuilder.eq).toHaveBeenCalledWith('user_id', TARGET_USER_ID);
      expect(txBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  // ============================================================================
  // 4. PATCH /api/sessions/:id/status
  // ============================================================================
  describe('PATCH /api/sessions/:id/status', () => {
    it('should allow valid non-COMPLETED transition OPEN -> LOCKED with 200', async () => {
      let sessionsCall = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          sessionsCall += 1;
          if (sessionsCall === 1) {
            return createQueryBuilder({
              data: { id: SESSION_ID, host_id: HOST_ID, status: 'OPEN' },
              error: null
            });
          }
          return createQueryBuilder({
            data: { id: SESSION_ID, host_id: HOST_ID, status: 'LOCKED' },
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: HOST_ID,
          status: 'LOCKED'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('LOCKED');
    });

    it('should allow valid transition and recalculate metrics when status becomes COMPLETED', async () => {
      const profilesUpdateBuilder = createQueryBuilder({ data: null, error: null });
      let sessionsCall = 0;
      let spCall = 0;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          sessionsCall += 1;
          if (sessionsCall === 1) {
            return createQueryBuilder({
              data: { id: SESSION_ID, host_id: HOST_ID, status: 'IN_PROGRESS' },
              error: null
            });
          }
          return createQueryBuilder({
            data: { id: SESSION_ID, host_id: HOST_ID, status: 'COMPLETED' },
            error: null
          });
        }
        if (table === 'session_participants') {
          spCall += 1;
          if (spCall === 1) {
            return createQueryBuilder({
              data: [{ user_id: TARGET_USER_ID }],
              error: null
            });
          }
          return createQueryBuilder({
            data: [
              {
                user_id: TARGET_USER_ID,
                session_id: SESSION_ID,
                attendance_status: 'ATTENDED'
              },
              {
                user_id: TARGET_USER_ID,
                session_id: '99999999-9999-4999-8999-999999999999',
                attendance_status: 'NO_SHOW'
              }
            ],
            error: null
          });
        }
        if (table === 'profiles') {
          return profilesUpdateBuilder;
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: HOST_ID,
          status: 'COMPLETED'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('COMPLETED');
      expect(profilesUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_sessions_completed: 2,
          show_up_rate: 50
        })
      );
      expect(profilesUpdateBuilder.in).toHaveBeenCalledWith('id', [TARGET_USER_ID]);
    });

    it('should reject forbidden status transition with 400 (COMPLETED -> OPEN and backward transition)', async () => {
      const openRes = await app.request(`/api/sessions/${SESSION_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: HOST_ID,
          status: 'OPEN'
        })
      });
      expect(openRes.status).toBe(400);

      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return createQueryBuilder({
            data: { id: SESSION_ID, host_id: HOST_ID, status: 'IN_PROGRESS' },
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: HOST_ID,
          status: 'LOCKED'
        })
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('should reject non-host user with 403', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'sessions') {
          return createQueryBuilder({
            data: { id: SESSION_ID, host_id: HOST_ID, status: 'OPEN' },
            error: null
          });
        }
        return createQueryBuilder({ data: [], error: null });
      });

      const res = await app.request(`/api/sessions/${SESSION_ID}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: REVIEWER_ID,
          status: 'LOCKED'
        })
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('should compute show_up_rate accurately including zero-session default and 2-decimal rounding', () => {
      expect(computeReputationSessionMetrics([])).toEqual({
        total_sessions_completed: 0,
        show_up_rate: 100
      });

      expect(
        computeReputationSessionMetrics([
          { session_id: 's1', attendance_status: 'ATTENDED' },
          { session_id: 's2', attendance_status: 'ATTENDED' },
          { session_id: 's3', attendance_status: 'NO_SHOW' },
          { session_id: 's4', attendance_status: 'CANCELLED' }
        ])
      ).toEqual({
        total_sessions_completed: 3,
        show_up_rate: 66.67
      });
    });
  });
});
