import { Hono } from 'hono';
import { supabase } from '../db/supabase';
import { splitTeams, PlayerInput } from '../services/teamSplitter';

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
          karmaScore: creditScore, // adapter kompatibilitas tipe ke teamSplitter
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
    const mapMember = (p: any, assignedTeam: 'Team A' | 'Team B') => ({
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

    const membersA = splitResult.teamA.map((p: any) => mapMember(p, 'Team A'));
    const membersB = splitResult.teamB.map((p: any) => mapMember(p, 'Team B'));

    const totalSkillA = membersA.reduce((sum, m) => sum + m.skill_rating_points, 0);
    const totalSkillB = membersB.reduce((sum, m) => sum + m.skill_rating_points, 0);
    const avgSkillA = membersA.length > 0 ? Number((totalSkillA / membersA.length).toFixed(1)) : 0;
    const avgSkillB = membersB.length > 0 ? Number((totalSkillB / membersB.length).toFixed(1)) : 0;

    const maxAvg = Math.max(avgSkillA, avgSkillB);
    const diffPercent = maxAvg > 0 ? Number(((Math.abs(avgSkillA - avgSkillB) / maxAvg) * 100).toFixed(2)) : 0;

    const data = {
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
