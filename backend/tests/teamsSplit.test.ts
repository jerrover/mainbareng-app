import app from '../src/index';
import { supabase } from '../src/db/supabase';

jest.mock('../src/db/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn()
    }
  };
});

describe('POST /api/sessions/:id/teams/split - Balanced Team Splitter Endpoint (FR-07)', () => {
  const mockFrom = supabase.from as jest.Mock;

  const createQueryBuilder = (result: any) => {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 when session is not found', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return createQueryBuilder({ data: null, error: null });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    const res = await app.request('/api/sessions/00000000-0000-0000-0000-000000000000/teams/split', {
      method: 'POST'
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Sesi tidak ditemukan');
  });

  it('should return 400 when session has fewer than 2 participants', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return createQueryBuilder({
          data: { id: 'sess-single', activity_type: 'futsal', status: 'OPEN' },
          error: null
        });
      }
      if (table === 'session_participants') {
        return createQueryBuilder({
          data: [
            {
              id: 'part-1',
              session_id: 'sess-single',
              user_id: 'u-1',
              slot_number: 1,
              assigned_team: null,
              attendance_status: 'CONFIRMED',
              profiles: { id: 'u-1', full_name: 'Solo Player', credit_score: 95 }
            }
          ],
          error: null
        });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    const res = await app.request('/api/sessions/sess-single/teams/split', {
      method: 'POST'
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('minimal 2 orang');
  });

  it('should successfully split players into balanced teams and return 200', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return createQueryBuilder({
          data: { id: 'sess-success', activity_type: 'badminton', status: 'OPEN' },
          error: null
        });
      }
      if (table === 'session_participants') {
        return createQueryBuilder({
          data: [
            {
              id: 'part-1',
              session_id: 'sess-success',
              user_id: 'u-1',
              slot_number: 1,
              assigned_team: null,
              attendance_status: 'CONFIRMED',
              profiles: { id: 'u-1', full_name: 'Player One', credit_score: 100 }
            },
            {
              id: 'part-2',
              session_id: 'sess-success',
              user_id: 'u-2',
              slot_number: 2,
              assigned_team: null,
              attendance_status: 'CONFIRMED',
              profiles: { id: 'u-2', full_name: 'Player Two', credit_score: 90 }
            },
            {
              id: 'part-3',
              session_id: 'sess-success',
              user_id: 'u-3',
              slot_number: 3,
              assigned_team: null,
              attendance_status: 'CONFIRMED',
              profiles: { id: 'u-3', full_name: 'Player Three', credit_score: 85 }
            },
            {
              id: 'part-4',
              session_id: 'sess-success',
              user_id: 'u-4',
              slot_number: 4,
              assigned_team: null,
              attendance_status: 'CONFIRMED',
              profiles: { id: 'u-4', full_name: 'Player Four', credit_score: 95 }
            }
          ],
          error: null
        });
      }
      if (table === 'user_activity_profiles') {
        return createQueryBuilder({
          data: [
            { user_id: 'u-1', skill_rating_points: 1500 },
            { user_id: 'u-2', skill_rating_points: 1400 },
            { user_id: 'u-3', skill_rating_points: 1300 },
            { user_id: 'u-4', skill_rating_points: 1200 }
          ],
          error: null
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });

    const res = await app.request('/api/sessions/sess-success/teams/split', {
      method: 'POST'
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const data = body.data;
    expect(data.session_id).toBe('sess-success');
    expect(data.team_a).toBeDefined();
    expect(data.team_b).toBeDefined();
    expect(data.team_a.name).toBe('Team A');
    expect(data.team_b.name).toBe('Team B');
    expect(data.team_a.members.length).toBe(2);
    expect(data.team_b.members.length).toBe(2);
    expect(typeof data.team_a.average_skill).toBe('number');
    expect(typeof data.team_b.average_skill).toBe('number');
    expect(typeof data.skill_difference_percent).toBe('number');

    // Pastikan anggota memiliki format ParticipantRecord yang valid
    for (const member of data.team_a.members) {
      expect(member.assigned_team).toBe('Team A');
      expect(member.session_id).toBe('sess-success');
      expect(typeof member.skill_rating_points).toBe('number');
    }
    for (const member of data.team_b.members) {
      expect(member.assigned_team).toBe('Team B');
      expect(member.session_id).toBe('sess-success');
      expect(typeof member.skill_rating_points).toBe('number');
    }
  });

  it('should return 500 when database fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sessions') {
        return createQueryBuilder({
          data: null,
          error: { message: 'Database connection failed' }
        });
      }
      return createQueryBuilder({ data: [], error: null });
    });

    const res = await app.request('/api/sessions/sess-err/teams/split', {
      method: 'POST'
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Database connection failed');
  });
});
