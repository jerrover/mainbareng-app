const { Hono } = require('hono');
const { supabase } = require('../db/supabase');

const sessionRouter = new Hono();

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
  } catch (err) {
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
  } catch (err) {
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
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

module.exports = { sessionRouter };
