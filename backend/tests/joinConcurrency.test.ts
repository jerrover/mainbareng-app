import app from '../src/index';
import { supabase } from '../src/db/supabase';

/**
 * Concurrency Test: POST /api/sessions/join (FR-05, FR-06, NFR-01)
 *
 * Membuktikan route join menangani perebutan 1 slot terakhir dengan benar:
 * dari N request paralel ke sesi yang sama, tepat 1 yang sukses (200)
 * dan sisanya ditolak secara elegan (400), tanpa overbooking.
 *
 * Batasan yang harus dipahami saat membaca test ini:
 * - Supabase di-mock di sini. Mock meniru perilaku database yang sudah
 *   dijamin atomik oleh stored function join_session_atomic (row lock
 *   FOR UPDATE di schema.sql), yaitu hanya panggilan pertama yang
 *   mengembalikan success true, sisanya success false "Session is full".
 * - Jadi test ini membuktikan lapisan API (route + pemetaan status HTTP)
 *   sudah benar saat menghadapi hasil konkuren, BUKAN membuktikan
 *   atomicity database itu sendiri.
 * - Pembuktian atomicity database yang sebenarnya ada di skrip k6 live:
 *   backend/tests/concurrency/join-slot-race.k6.js, yang menembak
 *   endpoint live ke Supabase asli. Skrip itu butuh API key dari Jeremy
 *   dan data seed dari Jerikho, jadi tidak dijalankan di CI.
 */

jest.mock('../src/db/supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn()
    }
  };
});

describe('POST /api/sessions/join - Concurrency (FR-05, NFR-01)', () => {
  const mockRpc = supabase.rpc as jest.Mock;
  const sessionId = '00000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow exactly 1 success out of 10 parallel joins for the last slot', async () => {
    // Tiru join_session_atomic: hanya panggilan pertama yang sukses,
    // sisanya ditolak karena slot sudah penuh. Delay kecil dibuat agar
    // kesepuluh request benar-benar berjalan paralel, bukan berurutan.
    let callCount = 0;
    mockRpc.mockImplementation(async () => {
      callCount += 1;
      const myCall = callCount;
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (myCall === 1) {
        return {
          data: {
            success: true,
            message: 'Joined successfully',
            slot_number: 1,
            session_locked: true
          },
          error: null
        };
      }
      return {
        data: { success: false, message: 'Session is full' },
        error: null
      };
    });

    const userIds = Array.from(
      { length: 10 },
      (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
    );

    const responses = await Promise.all(
      userIds.map((userId) =>
        app.request('/api/sessions/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, user_id: userId })
        })
      )
    );

    const statuses = responses.map((res) => res.status);
    const bodies = await Promise.all(responses.map((res) => res.json()));

    // Tepat 1 sukses, 9 ditolak. Tidak ada overbooking.
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 400)).toHaveLength(9);

    // Hanya pemenang yang mendapat slot_number, yang ditolak tidak.
    const winners = bodies.filter((b: any) => b.success === true);
    expect(winners).toHaveLength(1);
    expect(winners[0].slot_number).toBe(1);
    expect(bodies.filter((b: any) => b.success === false)).toHaveLength(9);

    // Semua 10 request sampai ke RPC, masing-masing dengan user berbeda.
    expect(mockRpc).toHaveBeenCalledTimes(10);
    expect(mockRpc).toHaveBeenCalledWith('join_session_atomic', {
      p_session_id: sessionId,
      p_user_id: expect.any(String)
    });
    const calledUserIds = mockRpc.mock.calls.map(
      (call: any[]) => call[1].p_user_id
    );
    expect(new Set(calledUserIds).size).toBe(10);
  });

  it('should return 200 with slot_number on a single successful join', async () => {
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        message: 'Joined successfully',
        slot_number: 3,
        session_locked: false
      },
      error: null
    });

    const res = await app.request('/api/sessions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: '00000000-0000-4000-8000-000000000099'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.slot_number).toBe(3);
  });

  it('should return 400 without calling RPC when session_id or user_id is missing', async () => {
    const res = await app.request('/api/sessions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });

    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should return 500 when the RPC call itself errors', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' }
    });

    const res = await app.request('/api/sessions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: '00000000-0000-4000-8000-000000000099'
      })
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
