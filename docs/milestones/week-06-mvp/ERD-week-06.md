# Spesifikasi Formal Physical Data Model (ERD) Platform Mabar — Milestone 2 (Week 6)

**Deliverable ID:** E-28  
**Bagian Laporan:** Part B (B6.2 System Design — Database Schema)  
**Database Target:** PostgreSQL 15.8 (Supabase Cloud Infrastructure)  
**Terkait Diagram Visual:** `assets/diagrams/erd_mabar.png` (Crow's Foot Field-to-Field PDM)  
**Tanggal Rilis:** 27 September 2026  
**Status:** Approved & Live in Production

---

## 1. Ikhtisar Arsitektur Basis Data

Platform Mabar (MainBareng) mengimplementasikan model data relasional ternormalisasi (Third Normal Form / 3NF) yang terdiri dari **11 entitas fisik**. Seluruh tabel dilindungi oleh aturan keamanan setingkat mesin RDBMS melalui PostgreSQL **Row Level Security (RLS)**, partial unique index untuk pencegahan overbooking slot, serta stored procedure transaksi atomik (`SECURITY DEFINER`).

---

## 2. Kamus Data & Struktur Entitas Fisik (Data Dictionary)

### 2.1. Tabel `profiles` (Master Akun Pengguna)
Menyimpan identitas terverifikasi pengguna yang terhubung langsung ke tabel internal otentikasi Supabase (`auth.users`).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, REFERENCES `auth.users(id)` ON DELETE CASCADE | ID unik pengguna dari Supabase Auth. |
| `email` | `TEXT` | **UNIQUE**, NOT NULL | Alamat surel aktif terverifikasi. |
| `full_name` | `TEXT` | NOT NULL | Nama lengkap atau nama panggilan akun. |
| `avatar_url` | `TEXT` | NULLABLE | URL berkas foto profil pengguna. |
| `phone_number` | `TEXT` | NULLABLE | Nomor kontak WhatsApp untuk koordinasi tim. |
| `credit_score` | `INTEGER` | NOT NULL, DEFAULT 100, CHECK (0-100) | Nilai reputasi sportivitas & kehadiran (Karma Score). |
| `total_sessions_completed` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK (>= 0) | Akumulasi sesi yang berhasil dihadiri. |
| `show_up_rate` | `NUMERIC(5,2)` | NOT NULL, DEFAULT 100.00 | Persentase tingkat kehadiran (0.00% s/d 100.00%). |
| `is_suspended` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Status pembekuan akun akibat pelanggaran/laporan. |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pendaftaran akun. |
| `updated_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pembaruan profil terakhir. |

---

### 2.2. Tabel `user_activity_profiles` (Sub-Profil Per Olahraga/Esports)
Menyimpan spesifikasi skill level, IGN, dan peran bermain per cabang olahraga atau esports (FR-02, FR-11).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik sub-profil. |
| `user_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pemilik profil. |
| `activity_type` | `TEXT` | NOT NULL (e.g. `'futsal'`, `'badminton'`, `'mlbb'`) | Kategori cabang aktivitas. |
| `in_game_name` | `TEXT` | NULLABLE | Nama karakter dalam game (IGN) untuk esports. |
| `game_id_tag` | `TEXT` | NULLABLE | Server ID / User Tag. |
| `preferred_role` | `TEXT` | NULLABLE (e.g. `'striker'`, `'midlane'`) | Posisi / peran bermain favorit. |
| `skill_rating` | `INTEGER` | NOT NULL, DEFAULT 1200 | Skor elo/peringkat keahlian awal. |
| `skill_level` | `TEXT` | NOT NULL, DEFAULT `'BEGINNER'` | Label tingkat keahlian (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`). |
| `matches_played` | `INTEGER` | NOT NULL, DEFAULT 0 | Jumlah pertandingan yang dimainkan di cabang ini. |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu deklarasi sub-profil. |

* **Constraint Unik:** `UNIQUE (user_id, activity_type)` — Satu pengguna hanya memiliki satu sub-profil per cabang.

---

### 2.3. Tabel `venues` (Katalog Tempat Fisik & Lapangan)
Menampung inventaris lapangan olahraga dan gaming arena terverifikasi (FR-13).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik venue. |
| `name` | `TEXT` | NOT NULL | Nama lapangan / arena. |
| `address` | `TEXT` | NOT NULL | Alamat fisik lengkap. |
| `city` | `TEXT` | NOT NULL | Kota operasional (e.g. `'Tangerang'`, `'Jakarta'`). |
| `latitude` | `NUMERIC(10,7)`| NULLABLE | Koordinat peta lintang. |
| `longitude`| `NUMERIC(10,7)`| NULLABLE | Koordinat peta bujur. |
| `phone_contact` | `TEXT` | NULLABLE | Nomor WhatsApp pengelola untuk reservasi. |
| `pricing_hourly_min` | `INTEGER` | NULLABLE | Rentang tarif sewa terendah per jam (IDR). |
| `pricing_hourly_max` | `INTEGER` | NULLABLE | Rentang tarif sewa tertinggi per jam (IDR). |
| `supported_activities` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Daftar olahraga/game yang didukung lapangan. |
| `facilities` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Fasilitas (e.g. `'parkir'`, `'shower'`, `'kantin'`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pencatatan data venue. |

---

### 2.4. Tabel `sessions` (Lobby & Jadwal Sesi Mabar)
Entitas sentral penjadwalan aktivitas bersama (FR-03, FR-04, FR-05, FR-12).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik sesi mabar. |
| `host_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` | Pengguna pembuat/penanggung jawab sesi. |
| `venue_id` | `UUID` | **FOREIGN KEY** REFERENCES `venues(id)` (NULLABLE) | Referensi ke venue resmi (jika ada). |
| `activity_type` | `TEXT` | NOT NULL | Cabang olahraga atau game. |
| `title` | `TEXT` | NOT NULL | Judul pengumuman sesi mabar. |
| `description` | `TEXT` | NULLABLE | Catatan teknis atau aturan khusus bermain. |
| `start_time` | `TIMESTAMPTZ`| NOT NULL | Waktu mulai bermain. |
| `end_time` | `TIMESTAMPTZ`| NOT NULL | Waktu selesai bermain. |
| `duration_minutes` | `INTEGER` | NOT NULL, CHECK (> 0) | Durasi durasi sesi dalam menit. |
| `max_slots` | `INTEGER` | NOT NULL, CHECK (> 0) | Batas maksimal peserta fisik yang diterima. |
| `min_credit_score` | `INTEGER` | NOT NULL, DEFAULT 70 | Syarat reputasi minimum agar bisa mendaftar. |
| `required_skill_level` | `TEXT` | NOT NULL, DEFAULT `'ALL_LEVELS'` | Batasan kemahiran lawan bermain. |
| `team_format` | `TEXT` | NOT NULL, DEFAULT `'CASUAL'` | Format tim (e.g. `'5v5'`, `'2v2'`, `'CASUAL'`). |
| `estimated_cost_total`| `INTEGER`| NOT NULL, DEFAULT 0 | Total tagihan sewa tempat (IDR). |
| `custom_location` | `TEXT` | NULLABLE | Lokasi kustom jika bermain di lapangan umum. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'OPEN'` | Status sesi (`OPEN`, `FULL`, `PLAYING`, `COMPLETED`, `CANCELLED`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pembentukan sesi. |

---

### 2.5. Tabel `session_participants` (Roster Peserta Sesi)
Junction table yang memetakan partisipasi pengguna ke dalam sesi mabar (FR-05).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik registrasi slot. |
| `session_id` | `UUID` | **FOREIGN KEY** REFERENCES `sessions(id)` ON DELETE CASCADE | Sesi yang diikuti. |
| `user_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Peserta yang terdaftar. |
| `slot_number` | `INTEGER` | NOT NULL, CHECK (> 0) | Nomor kursi fisik di lobby (1 s/d `max_slots`). |
| `team_assignment` | `TEXT` | NOT NULL, DEFAULT `'UNASSIGNED'` | Penugasan kubu (`TEAM_A`, `TEAM_B`, `BENCH`). |
| `status` | `TEXT` | NOT NULL, DEFAULT `'JOINED'` | Status kepesertaan (`JOINED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`). |
| `joined_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pengguna berhasil mengambil slot. |

* **Proteksi Partial Unique Index:**
  1. `UNIQUE (session_id, user_id) WHERE status = 'JOINED'` — Mencegah satu user memiliki dua slot aktif di sesi yang sama.
  2. `UNIQUE (session_id, slot_number) WHERE status = 'JOINED'` — Mencegah dua user merebut nomor slot fisik yang sama secara konkuren.

---

### 2.6. Tabel `friendships` (Graf Pertemanan Antar-Pengguna — FR-17)
Associative entity yang mendukung relasi jejaring sosial M:N mandiri (*self-referencing*).

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik pertemanan. |
| `requester_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pihak yang mengirimkan permintaan pertemanan. |
| `addressee_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pihak penerima permintaan. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'PENDING'` | Status persahabatan (`PENDING`, `ACCEPTED`, `REJECTED`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu inisiasi permintaan. |
| `updated_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu respons konfirmasi. |

* **Constraint Validasi Bisnis:**
  * `CHECK (requester_id != addressee_id)` — Pengguna tidak dapat mengirim permintaan pertemanan ke diri sendiri.
  * `UNIQUE (requester_id, addressee_id)` — Mencegah spam permintaan pertemanan duplikat.

---

### 2.7. Tabel `session_invites` (Undangan Langsung ke Sesi — FR-17)
Ternary junction table yang menghubungkan pengundang, teman terundang, dan sesi target.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik undangan sesi. |
| `session_id` | `UUID` | **FOREIGN KEY** REFERENCES `sessions(id)` ON DELETE CASCADE | Sesi mabar yang dituju. |
| `inviter_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Teman yang membagikan undangan. |
| `invitee_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Teman yang diundang ke lobby. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'PENDING'` | Status respon (`PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pengiriman undangan. |

---

### 2.8. Tabel `peer_reviews` (Evaluasi Timbal-Balik Pasca-Sesi — FR-10)
Menyimpan ulasan performa sportivitas dan akurasi skill yang diberikan oleh sesama peserta mabar.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik review. |
| `session_id` | `UUID` | **FOREIGN KEY** REFERENCES `sessions(id)` ON DELETE CASCADE | Sesi rujukan evaluasi. |
| `reviewer_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Penilai ulasan. |
| `target_user_id`| `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pengguna yang dinilai. |
| `sportsmanship_score` | `INTEGER` | NOT NULL, CHECK (1-5) | Skor keramahan & sportivitas (bintang 1-5). |
| `skill_assessment` | `TEXT` | NOT NULL, DEFAULT `'APPROPRIATE'` | Evaluasi keahlian (`TOO_EASY`, `APPROPRIATE`, `TOO_HARD`). |
| `feedback_tag` | `TEXT` | NULLABLE | Label cepat (e.g. `'friendly'`, `'on_time'`, `'clutch'`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pengisian review. |

* **Constraint Unik:** `UNIQUE (session_id, reviewer_id, target_user_id)` — Satu pengguna hanya dapat mengulas rekan yang sama sebanyak satu kali per sesi.

---

### 2.9. Tabel `credit_transactions` (Buku Besar Audit Karma Score — FR-10)
Append-only immutable audit ledger untuk merekam setiap delta kenaikan atau pemotongan skor reputasi.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik transaksi kredit. |
| `user_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Akun penerima mutasi reputasi. |
| `session_id` | `UUID` | **FOREIGN KEY** REFERENCES `sessions(id)` (NULLABLE) | Sesi yang memicu mutasi (jika ada). |
| `delta` | `INTEGER` | NOT NULL | Jumlah perubahan skor (e.g. `+2`, `+5`, `-20`). |
| `balance_after` | `INTEGER` | NOT NULL, CHECK (0-100) | Saldo skor setelah transaksi diterapkan. |
| `reason` | `TEXT` | NOT NULL | Alasan mutasi (`ATTENDANCE_ON_TIME`, `COMMENDED`, `NO_SHOW`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pencatatan mutasi. |

---

### 2.10. Tabel `user_reports` (Pencatatan Insiden & Moderasi — FR-10)
Menampung pelaporan tindak pelanggaran perilaku pengguna.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik tiket laporan. |
| `reporter_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pihak yang mengajukan aduan. |
| `reported_user_id`| `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pengguna terduga pelanggar. |
| `session_id` | `UUID` | **FOREIGN KEY** REFERENCES `sessions(id)` (NULLABLE) | Sesi tempat insiden terjadi. |
| `reason_category` | `TEXT` | NOT NULL | Klasifikasi (`TOXIC_BEHAVIOR`, `NO_SHOW`, `CHEATING`, `PAYMENT_FRAUD`). |
| `description` | `TEXT` | NOT NULL | Kronologi kejadian dari pelapor. |
| `status` | `TEXT` | NOT NULL, DEFAULT `'PENDING'` | Status moderasi admin (`PENDING`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`). |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu laporan dibuat. |

---

### 2.11. Tabel `user_blocks` (Daftar Blokir Antar-Pengguna)
Mekanisme pengamanan agar pemain yang berselisih tidak pernah dipertemukan dalam satu matchmaking.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | **PRIMARY KEY**, DEFAULT `gen_random_uuid()` | ID unik pemblokiran. |
| `blocker_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pengguna yang melakukan blokir. |
| `blocked_id` | `UUID` | **FOREIGN KEY** REFERENCES `profiles(id)` ON DELETE CASCADE | Pengguna yang diblokir. |
| `created_at` | `TIMESTAMPTZ`| NOT NULL, DEFAULT NOW() | Waktu pemblokiran dilakukan. |

* **Constraint Unik:** `UNIQUE (blocker_id, blocked_id)` — Mencegah duplikasi entri blokir identik.

---

## 3. Penjelasan Aturan Relasi & Kardinalitas Arsitektur

Model basis data ini dikelompokkan menjadi tiga kluster domain fungsional:

1. **User Identity & Social Graph Domain:**
   * Satu `profiles` memiliki relasi **1:N** ke `user_activity_profiles` (seorang pemain dapat memiliki profil keahlian untuk futsal, badminton, dan MLBB sekaligus).
   * Relasi antar-pengguna diselesaikan melalui **M:N Associative Entities** (`friendships` dan `user_blocks`). Kedua tabel ini menggunakan *multiple semantic role-playing foreign keys* yang menunjuk ke `profiles.id` (`requester_id` vs `addressee_id` dan `blocker_id` vs `blocked_id`) guna memfasilitasi kebijakan keamanan asimetris di level Row Level Security.
2. **Matchmaking & Session Lifecycle Domain:**
   * Entitas `profiles` (Host) dan `venues` berelasi **1:N** ke `sessions`.
   * Partisipasi sesi didekomposisi melalui entitas asosiatif `session_participants` (**M:N**). Integritas kuota fisik ditegakkan secara atomik melalui stored procedure `join_session_atomic` dengan lock baris `FOR UPDATE` dan didukung oleh partial unique index. Undangan pertemanan langsung ke lobby difasilitasi oleh tabel perantara `session_invites`.
3. **Governance, Reputation & Audit Ledger Domain:**
   * Sesi mabar yang telah selesai (`status = 'COMPLETED'`) memicu relasi **1:N** ke `peer_reviews` untuk penilaian timbal-balik antar-peserta.
   * Setiap ulasan dan presensi kehadiran memicu mutasi append-only ke `credit_transactions` (**1:N** dari `profiles` dan `sessions`), menjamin skor Karma pengguna dapat diaudit histori perubahannya secara transparan. Insiden pelanggaran dipetakan melalui entitas `user_reports`.

---

## 4. Kesimpulan Validasi

Kamus data ini telah terverifikasi sinkron 1:1 dengan berkas DDL SQL `backend/src/db/schema.sql`, file migrasi `backend/src/db/migrations/001_baseline_schema.sql` dan `002_friendships_and_invites.sql`, serta aktif beroperasi pada instance produksi Supabase Kelompok 2. Berkas ini memenuhi deliverable **E-28**.
