# Panduan Kontribusi — Tim Mabar (IF670 Kelompok 2)

Dokumen ini mengatur alur kerja (Git workflow), konvensi penamaan branch, dan standar Pull Request untuk pengembangan monorepo **Mabar (MainBareng)**.

---

## 🌳 1. Struktur Branch Utama

* **`main`** *(Production / Demo Grade)*:
  * Dilindungi (*Protected branch*). Dilarang keras melakukan direct push atau commit langsung ke `main`.
  * Hanya diperbarui melalui Pull Request dari `dev` saat rilis evaluasi resmi (Milestone Demo Week 6, Week 10, Week 14).
* **`dev`** *(Integration Hub)*:
  * Branch kerja utama harian seluruh tim.
  * Tempat mengintegrasikan fitur baru sebelum dinaikkan ke `main`.

---

## 🌿 2. Konvensi Penamaan Branch Fitur

Setiap pengembangan fitur atau perbaikan wajib dibuat di branch baru yang dicabangkan dari `dev`:

* `feat/mobile-<nama-fitur>`: Pengembangan antarmuka/fitur mobile (Expo).
  * Contoh: `feat/mobile-auth-screen`, `feat/mobile-session-feed`
* `feat/backend-<nama-fitur>`: Pengembangan API, database, atau business logic backend.
  * Contoh: `feat/backend-atomic-lock`, `feat/backend-venue-api`
* `fix/<komponen>-<deskripsi-bug>`: Perbaikan bug atau galat.
  * Contoh: `fix/backend-cors-error`, `fix/mobile-safearea-padding`
* `docs/<deskripsi>`: Pembaruan dokumentasi atau laporan.

---

## 🚀 3. Alur Kerja (Step-by-Step Workflow)

### Langkah 1: Tarik Update Terbaru & Buat Branch
Sebelum mulai ngoding, pastikan branch `dev` lokal Anda sinkron dengan remote:
```bash
git checkout dev
git pull origin dev
git checkout -b feat/backend-session-api
```

### Langkah 2: Koding & Verifikasi Lokal
Kerjakan kode di folder masing-masing (`mobile/` atau `backend/`). Sebelum commit, wajib jalankan verifikasi lokal:
* **Backend**: `cd backend && npm test` (pastikan seluruh unit test lolos).
* **Mobile**: `cd mobile && npx expo start` (pastikan tidak ada crash/syntax error).

### Langkah 3: Commit dengan Pesan Standar (Conventional Commits)
Gunakan format pesan commit yang jelas:
* `feat(backend): add create session endpoint with slot validation`
* `feat(mobile): implement discovery feed card component`
* `fix(backend): resolve race condition in atomic slot reservation`

### Langkah 4: Push & Buka Pull Request (PR)
Push branch fitur Anda ke remote GitHub:
```bash
git push -u origin feat/backend-session-api
```
Buka repo di GitHub dan buat Pull Request:
* **Target branch**: `dev` (Bukan `main`!).
* **Reviewer**: Tugaskan minimal 1 anggota tim untuk me-review.
* Setelah lolos review, merge dilakukan menggunakan opsi **Squash and merge**, lalu hapus branch fitur yang sudah di-merge.

---

## ⚠️ 4. Aturan Penting (Golden Rules)
1. **Dilarang Commit File Rahasia / Kredensial**: File `.env` lokal tidak boleh masuk ke git. Gunakan `.env.example` jika ada penambahan environment variable baru.
2. **Isolasi Monorepo**: Jangan mencampur commit perubahan `mobile/` dan `backend/` dalam satu commit kecuali perubahan tersebut saling berkaitan langsung secara kontraktual.
3. **Selalu Update Branch**: Jika branch `dev` di remote sudah maju saat Anda sedang mengerjakan fitur, lakukan `git merge origin/dev` atau `git rebase origin/dev` ke branch fitur Anda sebelum membuka PR.
