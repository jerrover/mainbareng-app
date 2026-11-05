import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const rawUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
// Normalisasi URL jika user menyalin URL lengkap dengan path /rest/v1
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || supabaseUrl.includes('placeholder')) {
  console.warn('[WARN] Supabase URL/Key is not configured. Database operations will fail until .env is set.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
