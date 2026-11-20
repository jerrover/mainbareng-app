// Setup user uji untuk uji k6 live join_session_atomic (Wave 2).
// Dijalankan sekali sebelum k6, dari root repo:
//   node backend/tests/concurrency/setup-test-users.js
//
// Cara kerja, singkatnya:
// - Baca SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dari backend/.env.
//   Service role key dipakai karena membuat user Auth hanya bisa
//   dilakukan admin, dan kunci itu memang kunci admin Supabase.
// - Buat 50 user Auth lewat supabase.auth.admin.createUser.
//   Trigger handle_new_user di database otomatis membuat baris profil
//   untuk tiap user, credit_score default 100, tidak suspended.
// - Tulis ID asli 50 user itu ke test-users.json di folder yang sama,
//   supaya skrip k6 memakai ID yang benar-benar ada di database.
//   File test-users.json TIDAK di-commit (sudah masuk .gitignore).
// - Kalau user sudah pernah dibuat (email sudah ada), dipakai ulang,
//   tidak dibuat dobel.
// - Script ini TIDAK mencetak kunci, password, atau email lengkap.
//   Yang dicetak hanya hitungan dan hasil verifikasi profil.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COUNT = parseInt(process.argv[2] || '50', 10);
const OUT_FILE = path.join(__dirname, 'test-users.json');

const rawUrl = process.env.SUPABASE_URL || '';
const url = rawUrl.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !key) {
  console.log('SETUP_FAIL: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ada di backend/.env');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function emailFor(i) {
  return `k6test${String(i).padStart(2, '0')}@mainbareng.test`;
}

(async () => {
  // Ambil semua user Auth yang sudah ada, supaya tidak dobel.
  const existingByEmail = {};
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.log('SETUP_FAIL listUsers:', error.message); process.exit(1); }
    for (const u of data.users) existingByEmail[u.email] = u.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  const ids = [];
  for (let i = 1; i <= COUNT; i += 1) {
    const email = emailFor(i);
    if (existingByEmail[email]) {
      ids.push(existingByEmail[email]);
      continue;
    }
    const password = crypto.randomBytes(24).toString('hex');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `K6 Test ${i}` }
    });
    if (error) {
      console.log(`SETUP_FAIL createUser ${i}:`, error.message);
      process.exit(1);
    }
    ids.push(data.user.id);
  }

  // Verifikasi profil: semua ID harus punya profil, skor 100, tidak suspended.
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id,credit_score,is_suspended')
    .in('id', ids);
  if (pErr) { console.log('SETUP_FAIL cek profiles:', pErr.message); process.exit(1); }
  const bad = profiles.filter((p) => p.credit_score < 70 || p.is_suspended);
  console.log(`SETUP_OK: users=${ids.length} profiles_found=${profiles.length} bad_score_or_suspended=${bad.length}`);
  if (profiles.length !== ids.length || bad.length > 0) {
    console.log('SETUP_FAIL: ada user uji yang profilnya tidak lengkap atau tidak layak join');
    process.exit(1);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(ids, null, 2) + '\n');
  console.log(`SETUP_OK: ID ditulis ke backend/tests/concurrency/test-users.json (${ids.length} id)`);
  process.exit(0);
})().catch((e) => { console.log('SETUP_FAIL:', e.message); process.exit(1); });
