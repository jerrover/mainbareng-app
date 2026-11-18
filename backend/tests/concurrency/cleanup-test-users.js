// Bersihkan data uji k6 live join_session_atomic (Wave 2).
// Dijalankan sesudah k6, dari root repo:
//   node backend/tests/concurrency/cleanup-test-users.js --session <uuid sesi uji>
//   -> hanya hapus peserta uji dari sesi itu, user uji tetap ada,
//      supaya sesi itu balik sisa 1 slot dan bisa dipakai lagi.
//   node backend/tests/concurrency/cleanup-test-users.js
//   -> hapus semua peserta uji di semua sesi, hapus semua 50 user
//      uji dari Auth (profil ikut terhapus karena ON DELETE CASCADE),
//      lalu hapus test-users.json.
//
// Cara kerja: baca service role key dari backend/.env, hapus lewat
// Supabase. Script ini TIDAK mencetak kunci, password, atau email.
// Yang dicetak hanya hitungan sebelum dan sesudah bersih-bersih.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const OUT_FILE = path.join(__dirname, 'test-users.json');
const args = process.argv.slice(2);
const sessionArg = args.indexOf('--session');
const onlySession = sessionArg >= 0 ? args[sessionArg + 1] : null;

const rawUrl = process.env.SUPABASE_URL || '';
const url = rawUrl.replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !key) {
  console.log('CLEANUP_FAIL: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ada di backend/.env');
  process.exit(1);
}
if (!fs.existsSync(OUT_FILE)) {
  console.log('CLEANUP_FAIL: test-users.json tidak ditemukan, jalankan setup-test-users.js dulu');
  process.exit(1);
}
const ids = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

(async () => {
  // Hapus peserta uji. Kalau --session diisi, hanya dari sesi itu.
  let q = supabase.from('session_participants').delete().in('user_id', ids);
  if (onlySession) q = q.eq('session_id', onlySession);
  const { data: deleted, error: delErr } = await q.select('id');
  if (delErr) { console.log('CLEANUP_FAIL hapus peserta:', delErr.message); process.exit(1); }
  const removedParticipants = Array.isArray(deleted) ? deleted.length : 0;
  console.log(`CLEANUP: peserta uji dihapus=${removedParticipants}${onlySession ? ` (sesi ${onlySession.slice(0, 8)})` : ' (semua sesi)'}`);

  if (onlySession) {
    console.log('CLEANUP_OK: user uji tetap ada, test-users.json tetap ada');
    process.exit(0);
  }

  // Hapus semua user uji dari Auth. Profil ikut terhapus otomatis.
  let removedUsers = 0;
  const failed = [];
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) failed.push(id.slice(0, 8));
    else removedUsers += 1;
  }
  console.log(`CLEANUP: user uji dihapus=${removedUsers} gagal=${failed.length}`);
  if (failed.length > 0) { console.log('CLEANUP_FAIL: sebagian user gagal dihapus:', failed.join(',')); process.exit(1); }

  fs.unlinkSync(OUT_FILE);
  console.log('CLEANUP_OK: test-users.json dihapus, data uji bersih');
  process.exit(0);
})().catch((e) => { console.log('CLEANUP_FAIL:', e.message); process.exit(1); });
