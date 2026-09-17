const { Hono } = require('hono');
const { supabase } = require('../db/supabase');

const venueRouter = new Hono();

// GET /api/venues - List all verified venues
venueRouter.get('/', async (c) => {
  const category = c.req.query('category');

  try {
    let query = supabase.from('venues').select('*').order('name');
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

module.exports = { venueRouter };
