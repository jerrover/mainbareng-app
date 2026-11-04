# Requirements Change Log — Milestone 2 (Week 6)

**Deliverable ID:** E-71  
**Bagian Laporan:** Part B (B6.1 Change Log)  
**Dokumen Induk PRD:** Dokumen Proposal & Requirements Milestone 1 (Week 3)  
**Tanggal Evaluasi:** 27 September 2026  
**Status Peninjauan:** Disetujui Tim Pengembang & Product Owner

---

## 1. Ikhtisar Perubahan

Seiring dengan kemajuan fase implementasi MVP dan arsitektur backend pada Milestone 2 (Week 4 s/d Week 6), tim pengembang mengidentifikasi beberapa penyesuaian fungsional dan teknis terhadap spesifikasi awal Week 3. Seluruh perubahan ini bertujuan untuk menjaga kelayakan teknis (*technical feasibility*), kepatuhan terhadap deadline semester, serta peningkatan kualitas interaksi sosial pengguna tanpa mengorbankan keamanan data.

---

## 2. Tabel Matriks Perubahan Kebutuhan (Requirements Change Log)

| ID Perubahan | ID Kebutuhan Terkait | Deskripsi Perubahan (*Change Description*) | Alasan Perubahan (*Engineering & Business Reason*) | Tanggal Usulan | Disetujui Oleh (*Approved by*) |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **CR-01** | FR-10 | **Terminologi Credit Score direvisi menjadi Karma Score.** Rentang tetap 0–100, namun kalkulasi mutasi dicatat secara eksplisit ke dalam *immutable ledger* (`credit_transactions`). | Menghindari konotasi negatif pinjaman finansial (*financial credit*) dan memperkuat persepsi gamifikasi reputasi sportivitas/kehadiran bagi komunitas pemain. | W4 | Product Owner & Tech Lead |
| **CR-02** | FR-14 | **Integrasi Payment Gateway Otomatis (Midtrans/Xendit) digeser dari scope MVP W6 ke rilis W12.** MVP W6–W11 berfokus pada *Kalkulator Split-Bill manual* dengan instruksi transfer bank / QRIS statis. | Mengurangi dependensi verifikasi badan usaha / legalitas payment gateway di fase prototype, serta mengisolasi risiko keamanan transaksi finansial di luar masa penilaian MVP. | W4 | Team Scrum & Dosen Pembimbing |
| **CR-03** | Scope MVP | **Target penyelesaian Full MVP dialihkan dari W6 ke W11.** Pada W6, deliverable difokuskan pada *MVP Prototype Alur Tipis* (Auth, Explore, Create, Join Lobby dengan Atomic Row Lock, ERD PDM, dan CI Automation). | Mengikuti arahan rubrik penilaian Milestone 2: W6 adalah evaluasi Design & Prototype arsitektur; implementasi menyeluruh (W7–W11) membutuhkan pengujian beban konkruensi dan integrasi API mendalam. | W5 | Seluruh Anggota Tim |
| **CR-04** | FR-17 | **Penambahan Fitur Baru: Pertemanan & Undangan Langsung ke Sesi Mabar (*Friendship & Session Direct Invites*).** Penambahan tabel `friendships` dan `session_invites`. | Kebutuhan mendesak dari hasil wawancara pengguna: pemain lebih nyaman mabar bersama lingkaran teman terlebih dahulu sebelum membuka slot sisa ke pemain asing publik. | W6 | Product Owner & Lead Architect |
| **CR-05** | FR-05, R-01 | **Mekanisme Join Sesi diubah dari Application-Level Check menjadi Stored Procedure Atomik (`join_session_atomic`) dengan Pessimistic Row Lock (`FOR UPDATE`).** | Menutup risiko kritis R-01 (*race condition overbooking* pada perebutan 1 slot terakhir) yang tidak dapat dijamin hanya dengan pembacaan logika di serverless function. | W5 | Lead Backend Engineer |

---

## 3. Dampak Terhadap Dokumen & Arsitektur Lain

1. **Skema Basis Data (B6.2):** Penambahan CR-04 terefleksi pada tabel `friendships` dan `session_invites` di `schema.sql`, file migrasi `002_friendships_and_invites.sql`, dan diagram ERD Crow's Foot.
2. **Katalog API (B6.2):** Menambahkan endpoint grup `/api/friends` dan `/api/sessions/:id/invite`.
3. **Traceability Matrix (B6.3):** Status verifikasi FR-05 dan FR-10 dimutakhirkan dengan bukti stored procedure dan ledger transaksi.
