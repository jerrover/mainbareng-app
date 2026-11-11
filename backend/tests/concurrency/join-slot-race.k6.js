/**
 * Live Concurrency Test: join_session_atomic (FR-05, NFR-01, R-01)
 *
 * Membuktikan stored function join_session_atomic tahan race condition
 * di database asli, bukan di mock. 50 virtual user menembak
 * POST /api/sessions/join secara bersamaan ke 1 slot terakhir.
 * Kriteria lolos (testing-plan.md): tepat 1 sukses, 49 ditolak secara
 * elegan, p95 latency di bawah 300 ms, tidak ada overbooking.
 *
 * CARA JALAN (tidak jalan di CI, hanya manual):
 *   1. Install k6: https://k6.io/docs/get-started/installation/
 *      Windows: winget install k6 --id Grafana.k6
 *   2. Siapkan sesi uji di Supabase (butuh API key dari Jeremy dan
 *      data seed dari Jerikho):
 *      - 1 sesi dengan status OPEN, max_slots 1 lebih banyak dari
 *        jumlah peserta yang sudah ada, sehingga tersisa tepat 1 slot.
 *      - 50 user uji dengan credit_score >= min_credit_score sesi,
 *        tidak suspended, dan belum join sesi itu.
 *   3. Jalankan dari root repo:
 *      k6 run backend/tests/concurrency/join-slot-race.k6.js \
 *        -e BASE_URL=https://mainbareng-app.vercel.app \
 *        -e SESSION_ID=<uuid sesi uji>
 *   4. Baca ringkasan di akhir: join_success harus 1, join_rejected 49.
 *      Kalau success lebih dari 1, berarti ada overbooking, laporkan
 *      sebagai bug R-01, jangan diabaikan.
 *   5. Bersihkan sesudah uji: batalkan peserta uji / hapus sesi uji,
 *      supaya tidak mengotori data Supabase tim.
 *
 * Skrip ini TIDAK membuat sesi atau user sendiri, sengaja. Membuat
 * data uji otomatis di database bersama terlalu berisiko tanpa
 * koordinasi dengan pemilik Supabase dan pemilik seed.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const joinSuccess = new Counter('join_success');
const joinRejected = new Counter('join_rejected');
const joinLatency = new Trend('join_latency_ms');

export const options = {
  // 50 VU, sesuai testing-plan.md. Ramp cepat supaya semua VU
  // benar-benar menembak dalam jendela waktu yang sama.
  stages: [
    { duration: '10s', target: 50 },
    { duration: '10s', target: 50 },
    { duration: '5s', target: 0 }
  ],
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

export default function () {
  // Satu user uji per VU, UUID deterministik supaya mudah dilacak
  // di tabel session_participants sesudah uji.
  const vuId = String(__VU).padStart(12, '0');
  const userId = `00000000-0000-4000-8000-${vuId}`;

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

  sleep(0.5);
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

  const passed = success === 1 && rejected === 49;
  const verdict = passed
    ? 'LOLOS: tepat 1 sukses, 49 ditolak, tidak ada overbooking.'
    : 'GAGAL: jumlah sukses bukan 1. Periksa session_participants, kemungkinan ada overbooking (R-01).';

  return {
    stdout: [
      '',
      '=== Hasil Uji Konkurensi join_session_atomic (NFR-01) ===',
      `Sesi uji        : ${SESSION_ID}`,
      `Sukses join     : ${success} (harus 1)`,
      `Ditolak         : ${rejected} (harus 49)`,
      `p95 latency     : ${p95} ms (harus < 300)`,
      `Kesimpulan      : ${verdict}`,
      '===========================================================',
      ''
    ].join('\n')
  };
}
