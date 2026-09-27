# Katalog Endpoint REST API Platform Mabar — Milestone 2 (Week 6)

**Deliverable ID:** E-72  
**Bagian Laporan:** Part B (B6.2 System Design — API Design)  
**Backend Framework:** Hono v4 (Serverless Node.js Runtime)  
**Database Driver:** Supabase Client & PostgreSQL RPC  
**Format Otorisasi:** JWT Bearer Token (`Authorization: Bearer <token>`)  
**Tanggal Rilis:** 27 September 2026

---

## 1. Arsitektur Komunikasi API

Seluruh endpoint backend mengimplementasikan format pertukaran data standar JSON dengan prefix global `/api`. Otentikasi dan otorisasi ditegakkan menggunakan token JWT yang diterbitkan oleh Supabase Auth, diverifikasi oleh middleware backend Hono, serta dievaluasi oleh PostgreSQL Row Level Security (RLS).

---

## 2. Katalog Endpoint API Lengkap

### 2.1. Modul Autentikasi & Profil Pengguna (`/api/auth`, `/api/profile`)

| Method | Endpoint Path | Tujuan Fungsional (*Purpose*) | Auth Required | Kebutuhan Terkait |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/auth/register` | Pendaftaran akun baru via email & password. | Tidak | FR-01 |
| `POST` | `/api/auth/login` | Otentikasi kredensial pengguna dan penerbitan JWT session. | Tidak | FR-01 |
| `POST` | `/api/auth/oauth/google` | Pertukaran authorization code Google SSO menjadi JWT sesi. | Tidak | FR-01 |
| `GET` | `/api/profile/me` | Mengambil data profil master, saldo Karma Score, dan statistik kehadiran. | **Ya** | FR-02, FR-10 |
| `PUT` | `/api/profile/me` | Memperbarui informasi personal (nama, foto profil, nomor kontak WhatsApp). | **Ya** | FR-02 |
| `GET` | `/api/profile/activities` | Mengambil daftar sub-profil keahlian olahraga/esports milik pengguna. | **Ya** | FR-02, FR-11 |
| `POST`| `/api/profile/activities` | Mendaftarkan preferensi cabang baru, IGN, peran favorit, dan deklarasi level. | **Ya** | FR-02, FR-11 |

---

### 2.2. Modul Sesi Mabar & Matchmaking (`/api/sessions`)

| Method | Endpoint Path | Tujuan Fungsional (*Purpose*) | Auth Required | Kebutuhan Terkait |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/sessions` | Mengambil feed daftar sesi mabar publik yang berstatus `OPEN`. | Tidak / Opsional | FR-03 |
| `GET` | `/api/sessions/:id` | Detail lengkap sesi mabar: info tempat, jadwal, kualifikasi, dan roster slot pemain. | **Ya** | FR-03, FR-05 |
| `POST` | `/api/sessions` | Membuat jadwal sesi mabar baru (User otomatis menjadi Host). | **Ya** | FR-04 |
| `POST` | `/api/sessions/:id/join` | Pendaftaran slot sesi melalui transaksi atomik `join_session_atomic` (Row Lock). | **Ya** | FR-05, R-01 |
| `POST` | `/api/sessions/:id/leave` | Pembatalan kepesertaan slot sebelum batas waktu sesi dimulai. | **Ya** | FR-05 |
| `PUT` | `/api/sessions/:id/status` | Host mengubah status sesi (`PLAYING`, `COMPLETED`, `CANCELLED`). | **Ya** (Host Only) | FR-04, FR-06 |
| `POST` | `/api/sessions/:id/split-teams`| Menjalankan kalkulasi pembagian kubu seimbang (Balanced Team Splitter). | **Ya** (Host Only) | FR-07 |

---

### 2.3. Modul Katalog Venue & Lapangan (`/api/venues`)

| Method | Endpoint Path | Tujuan Fungsional (*Purpose*) | Auth Required | Kebutuhan Terkait |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/venues` | Mengambil katalog lapangan dan gaming arena dengan filter cabang aktivitas & kota. | Tidak | FR-13 |
| `GET` | `/api/venues/:id` | Menampilkan detail venue, fasilitas fisik, rentang tarif, dan nomor WhatsApp. | Tidak | FR-13 |

---

### 2.4. Modul Pertemanan & Undangan Sesi (`/api/friends`, `/api/sessions/:id/invites` — FR-17)

| Method | Endpoint Path | Tujuan Fungsional (*Purpose*) | Auth Required | Kebutuhan Terkait |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/friends` | Mengambil daftar kontak pertemanan aktif (`status = 'ACCEPTED'`). | **Ya** | FR-17 |
| `POST` | `/api/friends/request` | Mengirimkan permintaan pertemanan ke pengguna lain melalui user ID. | **Ya** | FR-17 |
| `PUT` | `/api/friends/respond` | Menerima (`ACCEPTED`) atau menolak (`REJECTED`) permintaan pertemanan masuk. | **Ya** | FR-17 |
| `POST` | `/api/sessions/:id/invite` | Host/peserta mengundang teman langsung ke dalam lobby sesi sebelum kuota penuh. | **Ya** | FR-17 |
| `GET` | `/api/invites/me` | Mengambil daftar undangan sesi mabar yang ditujukan kepada pengguna aktif. | **Ya** | FR-17 |

---

### 2.5. Modul Evaluasi Reputasi & Moderasi (`/api/reviews`, `/api/reports` — FR-10)

| Method | Endpoint Path | Tujuan Fungsional (*Purpose*) | Auth Required | Kebutuhan Terkait |
| :---: | :--- | :--- | :---: | :---: |
| `POST` | `/api/reviews` | Mengirimkan ulasan sportivitas dan akurasi skill terhadap rekan satu sesi mabar. | **Ya** | FR-10 |
| `GET` | `/api/karma/history` | Mengambil riwayat mutasi kredit reputasi (audit ledger `credit_transactions`). | **Ya** | FR-10 |
| `POST` | `/api/reports` | Mengajukan tiket laporan perilaku buruk (toxic, AFK, penipuan biaya). | **Ya** | FR-10 |
| `POST` | `/api/users/block` | Memblokir pengguna agar tidak pernah berada dalam satu matchmaking sesi lagi. | **Ya** | NFR-02 |

---

## 3. Format Respons Standar

### Respons Sukses (`HTTP 200 OK` / `HTTP 201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Deskripsi keberhasilan operasi"
}
```

### Respons Galat Terkendali (`HTTP 400 Bad Request` / `HTTP 401 Unauthorized`)
```json
{
  "success": false,
  "error": {
    "code": "SLOT_ALREADY_FULL",
    "message": "Sesi ini telah memenuhi batas maksimum peserta."
  }
}
```

Berkas katalog API ini memenuhi deliverable **E-72** dan selaras dengan implementasi endpoint Hono di `backend/src/`.
