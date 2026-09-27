# Dokumen Penetapan Lingkup Minimum Viable Product (MVP Scope) — Platform Mabar

**Deliverable ID:** E-73  
**Bagian Laporan:** Part B (B6.3 MVP Scope & Traceability)  
**Target Rilis Penuh (Full MVP):** Week 11 (M3)  
**Status Evaluasi:** Week 6 (M2) — MVP Prototype & System Architecture  
**Tanggal:** 27 September 2026

---

## 1. Definisi & Filosofi Produk MVP Mabar

Minimum Viable Product (MVP) platform Mabar dirancang untuk memvalidasi hipotesis nilai bisnis (*Core Value Proposition*) paling mendasar: **Apakah sistem pencocokan berbasis reputasi dan keterbukaan kuota mampu memecahkan masalah kekurangan pemain (*shortage*) dan pembatalan sepihak (*no-show*) pada kegiatan olahraga dan gaming amatir?**

Oleh karena itu, batasan lingkup MVP dipisahkan secara tegas menggunakan prinsip prioritas **MoSCoW (Must-have, Should-have, Could-have, Won't-have)** untuk menjaga fokus tim dan mencegah pelebaran lingkup yang tidak terkendali (*scope creep*).

---

## 2. Matriks Pemetaan Kebutuhan Fungsional (FR Scope Matrix)

| ID Kebutuhan | Nama Fitur Fungsional | Kategori Prioritas | Status di MVP (W6–W11) | Justifikasi Rekayasa & Bisnis (*Reasoning*) |
| :---: | :--- | :---: | :---: | :--- |
| **FR-01** | Autentikasi Pengguna & SSO | **MUST** | **Masuk MVP** | Fondasi identitas dan keamanan data pribadi; wajib untuk mengikat reputasi ke satu akun unik. |
| **FR-02** | Manajemen Profil & Deklarasi Keahlian | **MUST** | **Masuk MVP** | Menampung preferensi cabang aktivitas dan deklarasi skill rating awal per olahraga/game. |
| **FR-03** | Feed Eksplorasi Sesi Publik | **MUST** | **Masuk MVP** | Fitur utama penemuan aktivitas (*discovery*); pengguna mencari sesi mabar yang kekurangan pemain. |
| **FR-04** | Pembuatan Sesi Mabar (Host) | **MUST** | **Masuk MVP** | Mengizinkan inisiator membuat jadwal, memilih venue, dan menentukan batas kuota pemain. |
| **FR-05** | Pendaftaran Slot & Concurrency Lock | **MUST** | **Masuk MVP** | Fitur transaksi inti; wajib memiliki row lock atomik (`join_session_atomic`) agar tidak terjadi overbooking. |
| **FR-06** | Manajemen Status Sesi & Presensi | **MUST** | **Masuk MVP** | Memungkinkan host memulai sesi, menandai kehadiran, dan menutup sesi untuk memicu review. |
| **FR-07** | Pembagian Tim Berimbang (Team Splitter) | **MUST** | **Masuk MVP** | Logika matematis membagi dua kubu seimbang berdasarkan skill rating agar pertandingan kompetitif. |
| **FR-08** | Chat Lobby & Koordinasi Sesi | **MUST** | **Masuk MVP** | Sarana komunikasi real-time antar-peserta yang terdaftar di lobby sebelum berangkat ke lokasi. |
| **FR-09** | Notifikasi Pengingat Jadwal & H-1 | **MUST** | **Masuk MVP** | Mengurangi risiko pemain lupa jadwal bermain (menurunkan tingkat no-show secara proaktif). |
| **FR-10** | Sistem Reputasi Karma & Peer Review | **MUST** | **Masuk MVP** | Mekanisme akuntabilitas utama: peserta memberi rating sportivitas pasca-pertandingan. |
| **FR-11** | Dynamic Skill Rating Adjustment (Elo) | **SHOULD** | **Di Luar MVP W6** | Memerlukan algoritma kalkulasi statistik yang kompleks; difokuskan pada Milestone W9–W10. |
| **FR-12** | Kalkulator Split-Bill Otomatis | **SHOULD** | **Sebagian (W6)** | Versi MVP W6 mencakup kalkulasi nominal per slot manual; integrasi otomatis diselesaikan W8. |
| **FR-13** | Katalog Venue & Direct WhatsApp Book | **SHOULD** | **Masuk MVP** | Mempermudah penentuan lokasi; data venue fisik dan kontak pengelola sudah aktif di DB. |
| **FR-14** | Payment Gateway Otomatis (Midtrans) | **WON'T** | **Di Luar MVP** | Ditunda ke rilis W12 (Post-MVP) untuk menghindari hambatan legalitas merchant dan risiko finansial. |
| **FR-15** | Integrasi Badge Prestasi & Gamifikasi | **COULD** | **Di Luar MVP** | Fitur pemanis engagement; tidak menghalangi alur pencarian teman mabar inti. |
| **FR-16** | Dashboard Analitik Penyelenggara Venue| **COULD** | **Di Luar MVP** | Ditujukan untuk mitra B2B; fokus MVP 100% pada pengalaman pemain (*player-first*). |
| **FR-17** | Pertemanan & Undangan Sesi Langsung | **SHOULD** | **Masuk MVP** | Skema database, migrasi, dan endpoint sudah siap sejak W6 untuk mendukung koordinasi circle privat. |

---

## 3. Alur Pengujian Prototipe Alur Tipis (Thin-Thread Prototype W6)

Pada Milestone 2 (Week 6), pengujian dan demonstrasi langsung difokuskan pada alur kerja terpendek yang memvalidasi integrasi ujung-ke-ujung (*end-to-end integration*):

$$\text{Registrasi/Login (FR-01)} \longrightarrow \text{Eksplorasi Feed (FR-03)} \longrightarrow \text{Buat Sesi (FR-04)} \longrightarrow \text{Ambil Slot Ber-Lock (FR-05)} \longrightarrow \text{Lobby Sesi}$$

Alur ini telah diverifikasi melalui pengujian integrasi Jest backend, migrasi skema fisik PostgreSQL 15, dan rancangan UI Langui Fusion. Berkas ini memenuhi deliverable **E-73**.
