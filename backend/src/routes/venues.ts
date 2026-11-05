import { Hono } from 'hono';
import { supabase } from '../db/supabase';

export const venueRouter = new Hono();

// GET /api/venues - List all verified venues
venueRouter.get('/', async (c) => {
  const category = c.req.query('category');

  try {
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      return c.json({
        success: false,
        error: 'Environment variables SUPABASE_URL / SUPABASE_ANON_KEY belum dikonfigurasi di Vercel Settings.'
      }, 500);
    }

    let query = supabase.from('venues').select('*').order('name');
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message, cause: String(err.cause || '') }, 500);
  }
});
