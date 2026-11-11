import { Hono } from 'hono';
import { supabase } from '../db/supabase';
import { splitTeams, PlayerInput } from '../services/teamSplitter';
import {
  buildReviewRuleEntries,
  computeReputationSessionMetrics,
  SessionParticipationMetricRow
} from '../services/peerReviewCalculator';
import {
  ALLOWED_SESSION_STATUS_TRANSITIONS,
  BalancedTeamResult,
  ParticipantRecord,
  ReviewTargetItem,
  SessionLifecycleStatus,
  reviewTargetsQuerySchema,
  sessionUuidParamSchema,
  submitPeerReviewsSchema,
  updateSessionStatusSchema
} from '../types/sessions';

export const sessionRouter = new Hono();

// GET /api/sessions - Feed Play Now & Scheduled (FR-04)
sessionRouter.get('/', async (c) => {
  const category = c.req.query('category');
  const mode = c.req.query('mode'); // 'play_now' | 'scheduled'

  try {
    let query = supabase
      .from('sessions')
      .select('*, profiles:host_id(full_name, credit_score), venues(name, address)')
      .order('start_time', { ascending: true });

    if (category) query = query.eq('session_category', category);
    if (mode) query = query.eq('session_mode', mode);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/sessions/create - Create Session (FR-03)
sessionRouter.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const {
      host_id,
      title,
      activity_type,
      session_category,
      session_mode,
      venue_id,
      custom_location,
      start_time,
      max_slots,
      min_credit_score,
      team_format,
      estimated_cost_total
    } = body;

    if (!host_id || !title || !activity_type || !max_slots || !start_time) {
      return c.json({ success: false, message: 'Missing required session parameters' }, 400);
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          host_id,
          title,
          activity_type,
          session_category: session_category || 'sports',
          session_mode: session_mode || 'scheduled',
          venue_id: venue_id || null,
          custom_location,
          start_time,
          max_slots,
          min_credit_score: min_credit_score || 70,
          team_format: team_format || '2_teams',
          estimated_cost_total: estimated_cost_total || 0,
          status: 'OPEN'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/sessions/join - Atomic Lock Join (FR-05, FR-06)
sessionRouter.post('/join', async (c) => {
  try {
    const { session_id, user_id } = await c.req.json();

    if (!session_id || !user_id) {
      return c.json({ success: false, message: 'session_id and user_id are required' }, 400);
    }

    // Panggil PostgreSQL Stored Function join_session_atomic di Supabase
    const { data, error } = await supabase.rpc('join_session_atomic', {
      p_session_id: session_id,
      p_user_id: user_id
    });

    if (error) throw error;

    const status = data?.success ? 200 : 400;
    return c.json(data, status);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/sessions/:id/teams/split - Balanced Team Splitter (FR-07)
sessionRouter.post('/:id/teams/split', async (c) => {
  const sessionId = c.req.param('id');

  if (!sessionId) {
    return c.json({ success: false, error: 'Parameter session_id wajib disertakan.' }, 400);
  }

  try {
    // 1. Validasi keberadaan sesi
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, activity_type, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr) {
      return c.json({ success: false, error: sessionErr.message }, 500);
    }

    if (!session) {
      return c.json({ success: false, error: 'Sesi tidak ditemukan.' }, 404);
    }

    // 2. Ambil daftar peserta sesi aktif
    const { data: participants, error: partErr } = await supabase
      .from('session_participants')
      .select('id, session_id, user_id, slot_number, assigned_team, attendance_status, profiles:user_id(id, full_name, credit_score)')
      .eq('session_id', sessionId)
      .neq('attendance_status', 'CANCELLED')
      .order('slot_number', { ascending: true });

    if (partErr) {
      return c.json({ success: false, error: partErr.message }, 500);
    }

    if (!participants || participants.length < 2) {
      return c.json(
        {
          success: false,
          error: 'Jumlah peserta minimal 2 orang untuk melakukan pembagian tim.'
        },
        400
      );
    }

    // 3. Ambil data skill rating dari user_activity_profiles untuk aktivitas sesi
    const userIds = participants.map((p: any) => p.user_id).filter(Boolean);
    const skillMap = new Map<string, number>();

    if (userIds.length > 0 && session.activity_type) {
      const { data: activityProfiles } = await supabase
        .from('user_activity_profiles')
        .select('user_id, skill_rating_points')
        .in('user_id', userIds)
        .eq('activity_type', session.activity_type);

      if (activityProfiles) {
        for (const act of activityProfiles) {
          skillMap.set(act.user_id, act.skill_rating_points);
        }
      }
    }

    // 4. Siapkan input pemain untuk service teamSplitter
    const playersForSplit: (PlayerInput & { participantId: string; slotNumber: number })[] = participants.map(
      (p: any) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        const creditScore = profile?.credit_score ?? 100;
        const skillRating = profile?.skill_rating ?? skillMap.get(p.user_id) ?? 1200;

        return {
          id: p.user_id,
          name: profile?.full_name || `Player ${p.slot_number}`,
          skillRating,
          creditScore,
          participantId: p.id,
          slotNumber: p.slot_number
        };
      }
    );

    // 5. Jalankan algoritma Balanced Team Splitter
    const splitResult = splitTeams(playersForSplit);

    // 6. Simpan hasil assigned_team ('Team A' / 'Team B') ke database
    const updatePromises = [
      ...splitResult.teamA.map((p: any) =>
        supabase
          .from('session_participants')
          .update({ assigned_team: 'Team A' })
          .eq('id', p.participantId)
      ),
      ...splitResult.teamB.map((p: any) =>
        supabase
          .from('session_participants')
          .update({ assigned_team: 'Team B' })
          .eq('id', p.participantId)
      )
    ];

    const updateResults = await Promise.all(updatePromises);
    for (const res of updateResults) {
      if (res.error) {
        return c.json({ success: false, error: res.error.message }, 500);
      }
    }

    // 7. Format output sesuai spesifikasi BalancedTeamResult
    const mapMember = (p: any, assignedTeam: 'Team A' | 'Team B'): ParticipantRecord => ({
      id: p.participantId,
      session_id: sessionId,
      user_id: p.id,
      is_guest: false,
      guest_name: null,
      invited_by_user_id: null,
      lock_as_duo: false,
      slot_number: p.slotNumber,
      assigned_team: assignedTeam,
      skill_rating_points: Number(p.skillRating || 1200),
      full_name: p.name,
      credit_score: p.creditScore
    });

    const membersA: ParticipantRecord[] = splitResult.teamA.map((p: any) => mapMember(p, 'Team A'));
    const membersB: ParticipantRecord[] = splitResult.teamB.map((p: any) => mapMember(p, 'Team B'));

    const totalSkillA = membersA.reduce((sum, m) => sum + m.skill_rating_points, 0);
    const totalSkillB = membersB.reduce((sum, m) => sum + m.skill_rating_points, 0);
    const avgSkillA = membersA.length > 0 ? Number((totalSkillA / membersA.length).toFixed(1)) : 0;
    const avgSkillB = membersB.length > 0 ? Number((totalSkillB / membersB.length).toFixed(1)) : 0;

    const maxAvg = Math.max(avgSkillA, avgSkillB);
    const diffPercent = maxAvg > 0 ? Number(((Math.abs(avgSkillA - avgSkillB) / maxAvg) * 100).toFixed(2)) : 0;

    const data: BalancedTeamResult = {
      session_id: sessionId,
      team_a: {
        name: 'Team A',
        total_skill: totalSkillA,
        average_skill: avgSkillA,
        members: membersA
      },
      team_b: {
        name: 'Team B',
        total_skill: totalSkillB,
        average_skill: avgSkillB,
        members: membersB
      },
      skill_difference_percent: diffPercent
    };

    return c.json({ success: true, data }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

function mapPeerReviewRpcErrorStatus(code?: string): 400 | 403 | 404 | 409 {
  switch (code) {
    case 'SESSION_NOT_FOUND':
      return 404;
    case 'NOT_PARTICIPANT':
      return 403;
    case 'DUPLICATE_REVIEW':
      return 409;
    default:
      return 400;
  }
}

async function recalculateParticipantsMetricsForSession(sessionId: string): Promise<void> {
  const { data: sessionParticipants, error: spErr } = await supabase
    .from('session_participants')
    .select('user_id')
    .eq('session_id', sessionId)
    .neq('attendance_status', 'CANCELLED');

  if (spErr) throw spErr;

  const userIds = Array.from(
    new Set((sessionParticipants || []).map((row: any) => row.user_id).filter(Boolean))
  ) as string[];

  if (userIds.length === 0) return;

  const { data: completedParticipations, error: metricsErr } = await supabase
    .from('session_participants')
    .select('user_id, session_id, attendance_status, sessions!inner(status)')
    .in('user_id', userIds)
    .neq('attendance_status', 'CANCELLED')
    .eq('sessions.status', 'COMPLETED');

  if (metricsErr) throw metricsErr;

  const rowsByUser = new Map<string, SessionParticipationMetricRow[]>();
  for (const uid of userIds) {
    rowsByUser.set(uid, []);
  }
  for (const row of completedParticipations || []) {
    const bucket = rowsByUser.get((row as any).user_id);
    if (bucket) {
      bucket.push({
        session_id: (row as any).session_id,
        attendance_status: (row as any).attendance_status
      });
    }
  }

  const groupedByMetrics = new Map<
    string,
    { total: number; showUpRate: number; userIds: string[] }
  >();

  for (const [uid, rows] of rowsByUser.entries()) {
    const metrics = computeReputationSessionMetrics(rows);
    const key = `${metrics.total_sessions_completed}:${metrics.show_up_rate}`;
    const existing = groupedByMetrics.get(key);
    if (existing) {
      existing.userIds.push(uid);
    } else {
      groupedByMetrics.set(key, {
        total: metrics.total_sessions_completed,
        showUpRate: metrics.show_up_rate,
        userIds: [uid]
      });
    }
  }

  const nowIso = new Date().toISOString();
  for (const group of groupedByMetrics.values()) {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        total_sessions_completed: group.total,
        show_up_rate: group.showUpRate,
        updated_at: nowIso
      })
      .in('id', group.userIds);

    if (updateErr) throw updateErr;
  }
}

// GET /api/sessions/:id/review-targets?reviewer_id=... - Daftar target review pasca-sesi (FR-09)
sessionRouter.get('/:id/review-targets', async (c) => {
  const paramParse = sessionUuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!paramParse.success) {
    return c.json({ success: false, error: paramParse.error.issues[0]?.message || 'Invalid session id' }, 400);
  }

  const queryParse = reviewTargetsQuerySchema.safeParse({ reviewer_id: c.req.query('reviewer_id') });
  if (!queryParse.success) {
    return c.json({ success: false, error: queryParse.error.issues[0]?.message || 'Query reviewer_id wajib valid UUID' }, 400);
  }

  const sessionId = paramParse.data.id;
  const reviewerId = queryParse.data.reviewer_id;

  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr) {
      return c.json({ success: false, error: sessionErr.message }, 500);
    }

    if (!session) {
      return c.json({ success: false, error: 'Sesi tidak ditemukan.' }, 404);
    }

    if (session.status !== 'COMPLETED') {
      return c.json(
        {
          success: false,
          error: 'Daftar target review hanya tersedia untuk sesi berstatus COMPLETED.'
        },
        400
      );
    }

    const { data: participants, error: partErr } = await supabase
      .from('session_participants')
      .select('id, user_id, assigned_team, attendance_status, profiles:user_id(id, full_name)')
      .eq('session_id', sessionId)
      .neq('attendance_status', 'CANCELLED')
      .order('slot_number', { ascending: true });

    if (partErr) {
      return c.json({ success: false, error: partErr.message }, 500);
    }

    const activeParticipants = participants || [];
    const isReviewerParticipant = activeParticipants.some((p: any) => p.user_id === reviewerId);

    if (!isReviewerParticipant) {
      return c.json(
        {
          success: false,
          error: 'Reviewer bukan peserta aktif pada sesi ini.'
        },
        403
      );
    }

    const targets: ReviewTargetItem[] = activeParticipants
      .filter((p: any) => p.user_id !== reviewerId)
      .map((p: any) => {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return {
          participant_id: p.id,
          display_name: profile?.full_name || 'Peserta Mabar',
          is_guest: false,
          assigned_team: p.assigned_team ?? null
        };
      });

    return c.json({ success: true, data: targets }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/sessions/:id/reviews - Submit batch peer reviews & mutasi Credit Score atomik (FR-09, FR-10)
sessionRouter.post('/:id/reviews', async (c) => {
  const paramParse = sessionUuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!paramParse.success) {
    return c.json({ success: false, error: paramParse.error.issues[0]?.message || 'Invalid session id' }, 400);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const bodyParse = submitPeerReviewsSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    return c.json(
      {
        success: false,
        error: bodyParse.error.issues[0]?.message || 'Payload peer review tidak valid.'
      },
      400
    );
  }

  const sessionId = paramParse.data.id;
  const { reviewer_id, reviews } = bodyParse.data;

  // Pastikan setiap item non-guest sesuai rule mapping KARMA_RULES
  for (const item of reviews) {
    if (!item.is_guest) {
      buildReviewRuleEntries(item.attendance, item.sportsmanship);
    }
  }

  try {
    const { data, error } = await supabase.rpc('submit_peer_reviews_atomic', {
      p_session_id: sessionId,
      p_reviewer_id: reviewer_id,
      p_reviews: reviews
    });

    if (error) {
      if ((error as any).code === '23505') {
        return c.json(
          {
            success: false,
            error: 'Review duplikat: Anda sudah pernah menilai peserta ini pada sesi yang sama.'
          },
          409
        );
      }
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data || data.ok === false) {
      const status = mapPeerReviewRpcErrorStatus(data?.code);
      return c.json(
        {
          success: false,
          error: data?.message || 'Gagal menyimpan peer review.'
        },
        status
      );
    }

    return c.json(
      {
        success: true,
        data: {
          session_id: data.session_id,
          reviewer_id: data.reviewer_id,
          submitted_count: data.submitted_count,
          skipped_guests: data.skipped_guests ?? [],
          results: data.results ?? []
        }
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PATCH /api/sessions/:id/status - Update status sesi oleh host + hitung ulang metrik saat COMPLETED
sessionRouter.patch('/:id/status', async (c) => {
  const paramParse = sessionUuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!paramParse.success) {
    return c.json({ success: false, error: paramParse.error.issues[0]?.message || 'Invalid session id' }, 400);
  }

  let rawBody: unknown;
  try {
    rawBody = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Payload JSON tidak valid.' }, 400);
  }

  const bodyParse = updateSessionStatusSchema.safeParse(rawBody);
  if (!bodyParse.success) {
    return c.json(
      {
        success: false,
        error: bodyParse.error.issues[0]?.message || 'Payload status sesi tidak valid.'
      },
      400
    );
  }

  const sessionId = paramParse.data.id;
  const { host_id, status: nextStatus } = bodyParse.data;

  try {
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, host_id, status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr) {
      return c.json({ success: false, error: sessionErr.message }, 500);
    }

    if (!session) {
      return c.json({ success: false, error: 'Sesi tidak ditemukan.' }, 404);
    }

    if (session.host_id !== host_id) {
      return c.json(
        {
          success: false,
          error: 'Hanya host pemilik sesi yang berhak mengubah status sesi.'
        },
        403
      );
    }

    const currentStatus = session.status as SessionLifecycleStatus;
    const allowedNext = ALLOWED_SESSION_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedNext.includes(nextStatus)) {
      return c.json(
        {
          success: false,
          error: `Transisi status dari ${currentStatus} ke ${nextStatus} tidak diizinkan.`
        },
        400
      );
    }

    const { data: updatedSession, error: updateErr } = await supabase
      .from('sessions')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('status', currentStatus)
      .select()
      .maybeSingle();

    if (updateErr) {
      return c.json({ success: false, error: updateErr.message }, 500);
    }

    if (!updatedSession) {
      return c.json(
        {
          success: false,
          error: 'Status sesi berubah secara bersamaan. Silakan muat ulang dan coba lagi.'
        },
        409
      );
    }

    if (nextStatus === 'COMPLETED') {
      await recalculateParticipantsMetricsForSession(sessionId);
    }

    return c.json({ success: true, data: updatedSession }, 200);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
