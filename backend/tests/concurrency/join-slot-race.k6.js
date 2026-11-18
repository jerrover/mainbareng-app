/**
 * Live Concurrency Test: join_session_atomic (FR-05, NFR-01, R-01)
 *
 * Membuktikan stored function join_session_atomic tahan race condition
 * di database asli, bukan di mock. Sejumlah virtual user menembak
 * POST /api/sessions/join secara bersamaan ke 1 slot terakhir.
 * Kriteria lolos (testing-plan.md): tepat 1 sukses, sisanya ditolak
 * secara elegan, p95 latency di bawah 300 ms, tidak ada overbooking.
 *
 * JUMLAH VU BISA DIATUR (Wave 2):
 *   - Sheet minta 20 request paralel.
 *   - testing-plan.md minta 50 VU.
 *   - Jalankan keduanya, 20 dulu baru 50, dengan -e VUS=20 / -e VUS=50.
 *   - Verdict di akhir memakai VUS yang dipakai saat itu, bukan
 *     angka 50 yang dikeraskan.
 *
 * ID USER UJI (Wave 2, perbaikan dari Wave 1):
 *   - Skrip Wave 1 memakai ID pura-pura 00000000-0000-4000-8000-...,
 *     ID itu tidak ada di tabel profiles, jadi join pasti ditolak
 *     dengan alasan profil tidak ditemukan, bukan karena slot penuh.
 *   - Sekarang ID dibaca dari backend/tests/concurrency/test-users.json,
 *     file yang dibuat setup-test-users.js dari 50 user Auth asli.
 *   - Kalau file itu tidak ada, skrip jatuh balik ke ID pura-pura,
 *     supaya tetap bisa dicek sintaks dan alurnya tanpa database.
 *
 * EXECUTOR (Wave 2, perbaikan penting):
 *   - Skrip Wave 1 memakai stages 10s + 10s + 5s. Stages mengulang
 *     tiap VU berkali-kali selama 25 detik, jadi jumlah ditolak jadi
 *     ribuan dan verdict 1 sukses / VUS-1 ditolak tidak akan pernah
 *     terpenuhi, padahal slotnya sudah benar.
 *   - Sekarang pakai per-vu-iterations dengan iterations 1: tiap VU
 *     menembak tepat 1 kali, total request tepat VUS, semua VU mulai
 *     bersamaan, jadi rebutan slotnya tetap terjadi.
 *
 * CARA JALAN (tidak jalan di CI, hanya manual):
 *   1. Install k6: https://k6.io/docs/get-started/installation/
 *      Windows: winget install k6 --id GrafanaLabs.k6
 *      (ID lama Grafana.k6 sudah tidak ada di winget, pakai GrafanaLabs.k6.)
 *   2. Buat user uji, dari root repo:
 *      node backend/tests/concurrency/setup-test-users.js
 *      Ini membuat 50 user Auth lewat service role key di backend/.env,
 *      lalu menulis ID mereka ke test-users.json (file ini tidak di-commit).
 *   3. Siapkan sesi uji di Supabase:
 *      - 1 sesi dengan status OPEN, max_slots 1 lebih banyak dari
 *        jumlah peserta yang sudah ada, sehingga tersisa tepat 1 slot.
 *      - Semua user uji credit_score 100, tidak suspended, dan belum
 *        join sesi itu.
 *   4. Jalankan dari root repo, contoh uji 20:
 *      k6 run backend/tests/concurrency/join-slot-race.k6.js \
 *        -e VUS=20 \
 *        -e BASE_URL=https://mainbareng-app.vercel.app \
 *        -e SESSION_ID=<uuid sesi uji>
 *      Uji 50 tinggal ganti -e VUS=50 dan pakai sesi OPEN lain yang
 *      sisanya juga tepat 1 slot, karena sesi pertama sudah penuh
 *      sesudah ada 1 pemenang.
 *   5. Baca ringkasan di akhir: join_success harus 1, join_rejected
 *      harus VUS dikurang 1. Kalau success lebih dari 1, berarti ada
 *      overbooking, laporkan sebagai bug R-01, jangan diabaikan.
 *   6. Bersihkan sesudah uji, dari root repo:
 *      node backend/tests/concurrency/cleanup-test-users.js --session <uuid sesi uji>
 *      untuk menghapus pemenang dari satu sesi saja, atau tanpa argumen
 *      untuk menghapus semua peserta uji dan semua 50 user uji.
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const joinSuccess = new Counter('join_success');
const joinRejected = new Counter('join_rejected');
const joinLatency = new Trend('join_latency_ms');

// Jumlah virtual user, default 50 sesuai testing-plan.md.
// Sheet Wave 2 minta 20, jadi jalankan dengan -e VUS=20 untuk bukti sheet.
const VUS = parseInt(__ENV.VUS || '50', 10);

if (!VUS || VUS < 2) {
  throw new Error('VUS harus diisi angka minimal 2, contoh: -e VUS=20');
}

export const options = {
  // Per-VU 1 iterasi: tiap VU menembak tepat 1 kali, total request
  // tepat VUS. Ini penting, karena executor stages bawaan akan
  // mengulang tiap VU berkali-kali selama 25 detik, sehingga jumlah
  // ditolak jadi ribuan dan verdict 1 sukses / VUS-1 ditolak tidak
  // akan pernah terpenuhi, padahal slotnya sudah benar.
  // per-vu-iterations memulai semua VU bersamaan, jadi rebutan
  // slotnya tetap terjadi di jendela waktu yang sama.
  scenarios: {
    join_race: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '30s'
    }
  },
  thresholds: {
    // p95 latency di bawah 300 ms, sesuai testing-plan.md.
    join_latency_ms: ['p(95)<300'],
    // Semua request harus dijawab 200 atau 400 secara elegan,
    // tidak boleh 500 atau timeout.
    http_req_failed: ['rate<0.01']
  }
};

const BASE_URL = __ENV.BASE_URL || 'https://mainbareng-app.vercel.app';
const SESSION_ID = __ENV.SESSION_ID;

if (!SESSION_ID) {
  throw new Error(
    'SESSION_ID wajib diisi lewat -e SESSION_ID=<uuid>. Baca header file ini untuk cara menyiapkan sesi uji.'
  );
}

// Daftar ID user uji asli, dibuat setup-test-users.js.
// open() di k6 dibaca relatif terhadap file skrip ini, jadi
// './test-users.json' berarti file di folder yang sama.
let testUserIds = [];
try {
  testUserIds = JSON.parse(open('./test-users.json'));
} catch (e) {
  testUserIds = [];
}

function userIdForVu(vu) {
  // Pakai ID asli kalau ada, supaya profil ditemukan di database.
  if (Array.isArray(testUserIds) && testUserIds.length >= vu) {
    return testUserIds[vu - 1];
  }
  // Jatuh balik ke ID pura-pura kalau file test-users.json belum ada.
  const vuId = String(vu).padStart(12, '0');
  return `00000000-0000-4000-8000-${vuId}`;
}

export default function () {
  // Satu user uji per VU, supaya mudah dilacak di tabel
  // session_participants sesudah uji.
  const userId = userIdForVu(__VU);

  const payload = JSON.stringify({
    session_id: SESSION_ID,
    user_id: userId
  });

  const res = http.post(`${BASE_URL}/api/sessions/join`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'join_session' }
  });

  joinLatency.add(res.timings.duration);

  let body = {};
  try {
    body = res.json();
  } catch (e) {
    body = {};
  }

  // 200 = berhasil join, 400 = ditolak (slot penuh / sudah join /
  // skor di bawah syarat). Keduanya jawaban yang sah, bukan error.
  check(res, {
    'join dijawab 200 atau 400': (r) => r.status === 200 || r.status === 400,
    'body punya field success': () => typeof body.success === 'boolean'
  });

  if (res.status === 200 && body.success === true) {
    joinSuccess.add(1);
  } else {
    joinRejected.add(1);
  }
}

export function handleSummary(data) {
  const success = data.metrics.join_success
    ? data.metrics.join_success.values.count
    : 0;
  const rejected = data.metrics.join_rejected
    ? data.metrics.join_rejected.values.count
    : 0;
  const p95 = data.metrics.join_latency_ms
    ? data.metrics.join_latency_ms.values['p(95)']
    : null;

  const expectedRejected = VUS - 1;
  const countOk = success === 1 && rejected === expectedRejected;
  const latencyOk = p95 !== null && p95 < 300;
  const passed = countOk && latencyOk;
  const verdict = passed
    ? `LOLOS: tepat 1 sukses, ${expectedRejected} ditolak, tidak ada overbooking, p95 di bawah 300 ms.`
    : 'GAGAL: periksa jumlah sukses, jumlah ditolak, dan p95 di atas. Kalau sukses lebih dari 1, kemungkinan ada overbooking (R-01).';

  return {
    stdout: [
      '',
      '=== Hasil Uji Konkurensi join_session_atomic (NFR-01) ===',
      `Sesi uji        : ${SESSION_ID}`,
      `Virtual user    : ${VUS}`,
      `Sukses join     : ${success} (harus 1)`,
      `Ditolak         : ${rejected} (harus ${expectedRejected})`,
      `p95 latency     : ${p95} ms (harus < 300)`,
      `Kesimpulan      : ${verdict}`,
      '===========================================================',
      ''
    ].join('\n')
  };
}
