import app from '../src/index';
import { supabase } from '../src/db/supabase';

/**
 * Unit Test: POST /api/sessions/leave (FR-05, FR-06)
 *
 * Menguji pembatalan / pelepasan slot partisipan secara atomik:
 * - Partisipan biasa sukses membatalkan slot (200)
 * - Auto-unlock: sesi LOCKED berubah jadi OPEN saat kapasitas berkurang
 * - Guard: Host ditolak jika mencoba leave slot biasa (400)
 * - Guard: Sesi selesai / batal ditolak (400)
 * - Guard: Bukan peserta aktif ditolak (400)
 * - Validasi schema payload Zod (400)
 */

jest.mock('../src/db/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn()
    }
  };
});

describe('POST /api/sessions/leave - Atomic Slot Cancellation (FR-05, FR-06)', () => {
  const mockRpc = supabase.rpc as jest.Mock;
  const sessionId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and released_slot when participant leaves an open session', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        message: 'Slot cancelled successfully',
        released_slot: 2,
        session_reopened: false,
        remaining_participants: 3
      },
      error: null
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        reason: 'Ada acara keluarga mendadak'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.released_slot).toBe(2);
    expect(body.session_reopened).toBe(false);
    expect(mockRpc).toHaveBeenCalledWith('leave_session_atomic', {
      p_session_id: sessionId,
      p_user_id: userId,
      p_reason: 'Ada acara keluarga mendadak'
    });
  });

  it('should return 200 with session_reopened: true when session was LOCKED', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        message: 'Slot cancelled successfully',
        released_slot: 10,
        session_reopened: true,
        remaining_participants: 9
      },
      error: null
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.session_reopened).toBe(true);
    expect(body.remaining_participants).toBe(9);
  });

  it('should return 400 when host attempts to leave session', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        message: 'Host cannot leave session as participant. Please cancel or reassign the session instead.'
      },
      error: null
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Host cannot leave session');
  });

  it('should return 400 when session is already COMPLETED or CANCELLED', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        message: 'Cannot cancel slot on a session that is already COMPLETED'
      },
      error: null
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Cannot cancel slot');
  });

  it('should return 400 when user is not an active participant', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: false,
        message: 'User is not an active participant in this session'
      },
      error: null
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('User is not an active participant');
  });

  it('should return 400 without calling RPC when session_id or user_id is missing or invalid UUID', async () => {
    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'not-a-valid-uuid',
        user_id: userId
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should return 500 when Supabase RPC call fails with exception', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' }
    });

    const res = await app.request('/api/sessions/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId
      })
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Database connection failed');
  });
});
