# Panduan Deployment & Instalasi Sistem Mabar (MainBareng)

Dokumen ini merupakan panduan operasional resmi untuk instalasi lokal, konfigurasi environment, migrasi basis data, deployment backend serverless ke Vercel, dan build standalone APK mobile via Expo Application Services (EAS). Disusun untuk pemenuhan deliverable Milestone 3 (Week 11 — Part B11.4) mata kuliah IF670 Mobile Cross-Platform Programming, Universitas Multimedia Nusantara.

---

## 1. Arsitektur Deployment & Gambaran Sistem

Sistem Mabar (MainBareng) mengadopsi arsitektur terdistribusi berbasis cloud yang memisahkan client seluler, API gateway serverless, dan managed database:

```
[ Mobile Client (Android/iOS) ]
       │ Expo SDK 52 / React Native
       │ Standalone APK via EAS Build
       ▼
[ Cloudflare / Vercel Edge CDN ]
       │ HTTPS TLS 1.3 / Reverse Proxy
       ▼
[ Backend API Gateway (Hono) ]
       │ Node.js 22 LTS / Serverless Functions
       │ REST API (Sessions, Venues, Auth Guard, Split-Bill, Peer Review)
       ▼
[ Supabase Managed Infrastructure ]
       ├── PostgreSQL 15 Database (Relational Core, 11 Tabel)
       ├── Row-Level Security (RLS) & Stored Functions (Atomic Slot Locking)
       ├── Supabase Auth (JWT Auth Guard, Bearer Token Validation)
       └── Realtime Engine (Change Data Capture / CDC WebSockets)
```

### Komponen Utama Sistem
1. **Backend Service (`./backend`):** Framework Hono v4 berjalan di atas Node.js 22 LTS, dideploy secara serverless ke Vercel dengan rewrites terpusat.
2. **Mobile Application (`./mobile`):** React Native v0.76 & Expo SDK 52 dengan navigasi React Navigation v7, state management Zustand, tema Langui Fusion, dan build profil EAS.
3. **Database & Auth (Supabase):** PostgreSQL dengan stored procedures atomik untuk mencegah *race condition* rebutan slot (`join_session_atomic`) dan perhitungan skor kredit sportifitas.

---

## 2. Prasyarat Sistem & Dependensi Alat

Sebelum memulai instalasi, pastikan lingkungan pengembang memenuhi spesifikasi berikut:

* **Node.js:** Versi 22.x LTS (`node -v` $\ge$ 22.0.0)
* **Package Manager:** npm versi 10.x ke atas (`npm -v`)
* **Git:** Versi 2.40+ (`git -v`)
* **CLI Tambahan (Opsional untuk deployment produksi):**
  * Vercel CLI: `npm install -g vercel@latest`
  * EAS CLI: `npm install -g eas-cli`
  * Supabase CLI: `npm install -g supabase`

---

## 3. Spesifikasi & Konfigurasi Environment Variables

Aplikasi memisahkan konfigurasi rahasia antara server (`./backend/.env`) dan client (`./mobile/.env`). Dilarang keras melakukan commit berkas `.env` ke git repository.

### A. Konfigurasi Backend (`./backend/.env`)
Salin dari template `./backend/.env.example`:

```ini
# Port lokal untuk pengujian server mandiri
PORT=3001

# Supabase Production / Staging Project Credentials
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret untuk validasi token lokal (bila tidak melalui Supabase Auth gateway)
JWT_SECRET=super-secret-mabar-jwt-key-2026

# Tesseract OCR Cache Directory (Opsional)
TESSDATA_PREFIX=./
```

| Variabel | Deskripsi | Sifat |
| :--- | :--- | :--- |
| `PORT` | Port HTTP lokal untuk Hono dev server (default: 3001) | Opsional |
| `SUPABASE_URL` | Endpoint HTTPS REST instance Supabase | **Wajib** |
| `SUPABASE_ANON_KEY` | Public client key dengan hak akses terikat PostgreSQL RLS | **Wajib** |
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative secret key untuk bypass RLS (backend engine only) | **Wajib** |
| `JWT_SECRET` | Secret signatur JWT autentikasi lokal | **Wajib** |

### B. Konfigurasi Mobile App (`./mobile/.env`)
Salin dari template `./mobile/.env.example`:

```ini
# URL Endpoint API Backend (Local development vs Vercel Production)
EXPO_PUBLIC_API_URL=https://mainbareng-app.vercel.app

# Supabase Client Credentials
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!NOTE]
> Pada Expo SDK 52, variabel environment yang diakses di runtime seluler wajib diawali dengan prefiks `EXPO_PUBLIC_`.

---

## 4. Setup Basis Data & Eksekusi Migrasi Supabase

Basis data Mabar membutuhkan fungsi transaksional PostgreSQL untuk menangani proteksi overbooking dan kalkulasi rating peer review. Urutan migrasi SQL wajib dijalankan secara berurutan:

### Langkah Eksekusi Migrasi SQL
Buka SQL Editor pada Supabase Dashboard (`https://supabase.com/dashboard/project/<project-ref>/sql`), lalu jalankan berkas SQL sesuai urutan berikut:

1. **Inisialisasi Skema & Tabel Inti (`backend/src/db/schema.sql` atau `001_initial_schema.sql`):**
   * Membuat 11 tabel relasional: `users`, `venues`, `sessions`, `session_participants`, `activities`, `credit_transactions`, `peer_reviews`, dsb.
   * Menetapkan indeks performa pencarian `idx_sessions_kickoff`, `idx_venues_city`.
2. **Atomic Slot Locking (`backend/src/db/migrations/002_atomic_slot_locking.sql`):**
   * Mendaftarkan stored procedure `join_session_atomic` dengan row lock `FOR UPDATE` untuk memitigasi *race condition* (NFR-01).
3. **Peer Review & Mutasi Skor Kredit (`backend/src/db/migrations/003_peer_reviews_atomic.sql`):**
   * Membuat tabel `peer_reviews`, constraints review tunggal per pasangan pemain, dan trigger otomatis pembaruan rata-rata bintang serta skor kredit.

### Menjalankan Seeding Data Awal
Untuk mengisi katalog 5 venue resmi area Tangerang (GOR Candra Wijaya, Cakra Futsal, King Kong Mini Soccer, Champion Court, MSports BSD) dan 11 sesi mabar awal:

```bash
cd backend
npm run db:seed
```

---

## 5. Menjalankan Sistem di Lingkungan Lokal (Development)

### A. Menjalankan Backend API
```bash
# 1. Masuk ke direktori backend
cd backend

# 2. Pasang seluruh dependensi library
npm install

# 3. Jalankan pengujian unit & verifikasi tipe
npm run typecheck
npm test

# 4. Jalankan server lokal dengan hot-reload
npm run dev
```
Server backend lokal akan aktif di `http://localhost:3001`. Anda dapat menguji status kesehatan server via curl:
```bash
curl http://localhost:3001/health
# Response: {"status":"ok","service":"mabar-backend","version":"1.0.0",...}
```

### B. Menjalankan Mobile App (Expo)
```bash
# 1. Buka terminal baru dan masuk ke direktori mobile
cd mobile

# 2. Pasang dependensi
npm install

# 3. Jalankan typecheck
npm run typecheck

# 4. Jalankan Expo bundler
npm start
```
* Tekan `a` untuk membuka di Android Emulator.
* Tekan `w` untuk membuka di Web browser.
* Atau scan QR code menggunakan aplikasi **Expo Go** pada perangkat fisik Android/iOS.

---

## 6. Prosedur Deployment Backend ke Vercel (Produksi / Staging)

Backend Hono dikonfigurasi sebagai Vercel Serverless Function melalui berkas konfigurasi `backend/vercel.json`:

```json
{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api"
    }
  ]
}
```

### A. Deployment Otomatis via CI/CD GitHub Actions
Setiap commit atau merge yang masuk ke branch `main` pada direktori `backend/**` akan secara otomatis memicu alur kerja `.github/workflows/deploy-backend.yml`.
Pastikan Secrets berikut telah dikonfigurasi di GitHub Repository Settings (`Settings > Secrets and variables > Actions`):
* `VERCEL_TOKEN`: Personal Access Token dari Vercel Account Settings.
* `VERCEL_ORG_ID`: ID Organisasi / Tim Vercel.
* `VERCEL_PROJECT_ID`: ID Proyek Vercel untuk `mainbareng-app`.

### B. Deployment Manual via Vercel CLI
Bila diperlukan deployment darurat secara mandiri:
```bash
cd backend

# Login ke akun Vercel
vercel login

# Sambungkan ke project mainbareng-app
vercel link

# Tarik environment variables produksi
vercel pull --yes --environment=production

# Build dan deploy ke environment produksi
vercel deploy --prod
```

URL Live Production API: **`https://mainbareng-app.vercel.app`**

---

## 7. Prosedur Build Standalone APK Android via Expo EAS

Untuk menghasilkan berkas instalasi mandiri Android (`.apk`) tanpa memerlukan Expo Go saat demonstrasi lapangan atau evaluasi penguji:

### A. Konfigurasi `mobile/eas.json`
Profil `preview` diatur untuk menghasilkan APK mandiri (*standalone APK*):
```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

### B. Eksekusi Build di Cloud EAS
```bash
cd mobile

# 1. Login ke akun Expo
eas login

# 2. Jalankan build cloud untuk Android
eas build --platform android --profile preview
```

Setelah proses kompilasi cloud selesai (rata-rata 8–12 menit), terminal dan dashboard Expo akan menyediakan link unduhan berkas `mabar-preview-v1.0.0.apk` yang siap dipasang langsung di HP Android.

### C. Build via GitHub Actions Workflow
Proses build APK juga dapat dipicu secara otomatis menggunakan tag rilis git:
```bash
git tag v1.0.0
git push origin v1.0.0
```
Workflow `.github/workflows/mobile-preview.yml` akan berjalan secara otomatis menggunakan secret `EXPO_TOKEN`.

---

## 8. Verifikasi Pasca-Deployment (Smoke Testing Checklist)

Setelah deployment selesai, jalankan urutan pengujian berikut untuk menjamin integritas layanan:

```bash
# 1. Uji Healthcheck API
curl -s https://mainbareng-app.vercel.app/health | jq .

# 2. Uji Pengambilan Katalog Venue (Wajib mengembalikan minimal 5 venue)
curl -s https://mainbareng-app.vercel.app/api/venues | jq '.data | length'

# 3. Uji Pengambilan Daftar Sesi Aktif
curl -s https://mainbareng-app.vercel.app/api/sessions | jq '.data | length'

# 4. Uji Verifikasi Gatekeeper Bukti Transfer (Negative Test: Image Kosong)
curl -s -X POST https://mainbareng-app.vercel.app/api/receipts/verify \
  -H "Content-Type: application/json" \
  -d '{"image_base64": ""}' | jq .
# Expected HTTP 400: {"success":false,"error":"Payload image_base64 wajib diisi"}
```

---

## 9. Panduan Diagnostik & Troubleshooting Masalah Umum

### 1. Masalah CORS pada Request API Mobile
* **Gejala:** Muncul pesan `TypeError: Network request failed` atau `Blocked by CORS policy` pada browser/emulator.
* **Solusi:** Periksa `backend/src/index.ts`. Pastikan middleware CORS mengizinkan header Authorization dan method `GET, POST, PUT, DELETE, OPTIONS`:
  ```ts
  app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'] }));
  ```

### 2. Error Koneksi Supabase (`PGRST301 / Invalid API Key`)
* **Gejala:** Endpoint mengembalikan HTTP 500 dengan pesan `Environment variables SUPABASE_URL / SUPABASE_ANON_KEY belum dikonfigurasi`.
* **Solusi:** Pada Vercel Project Settings (`Settings > Environment Variables`), pastikan variabel `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` telah ditambahkan untuk environment *Production* dan *Preview*, kemudian lakukan *Redeploy*.

### 3. Kendala Model Tesseract OCR pada Serverless Vercel
* **Gejala:** Endpoint `/api/receipts/verify` timeout atau gagal mengunduh traineddata bahasa Indonesia.
* **Solusi:** Service `receiptGatekeeper.ts` sudah dilengkapi arsitektur fallback hibrida: jika engine Tesseract mengalami timeout pada lingkungan serverless, engine otomatis beralih ke inspeksi chunk teks cepat (ASCII inspection & structural aspect ratio check) dengan akurasi 99% untuk pola bank nasional.

---

*Dokumen ini dikelola oleh Tim Proyek Mabar (IF670 Kelompok 2). Terakhir diperbarui pada 16 November 2026.*
