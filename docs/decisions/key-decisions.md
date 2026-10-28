# Key Design Decisions: Aturan Karma Score, Enum Status, dan Algoritma Balanced Team Splitter

**Deliverable ID:** E-13 / M2 Key Design Decisions  
**Terkait Kebutuhan:** FR-07 (Team Splitter), FR-10 (Karma Score / Dual Reputation), FR-11 (Skill Rating)  
**Tanggal Pengesahan:** 27 September 2026  
**Status:** Diterima & Diimplementasikan (Accepted & Live in Production)

---

## 1. Aturan Mutasi & Ambang Batas Karma Score (FR-10)

Platform Mabar menggunakan sistem skor reputasi terukur bernama **Karma Score** (sebelumnya disebut Credit Score) dengan skala absolut **0 hingga 100**. Seluruh pengguna baru memulai dengan skor modal default **100**.

### 1.1. Aturan Delta Skor
Perubahan skor dicatat secara transparan pada tabel buku besar audit `credit_transactions`:

| Aksi / Peristiwa | Delta Skor | Alasan Rekayasa & Bisnis |
| :--- | :---: | :--- |
| **Hadir Tepat Waktu (`ATTEND_ON_TIME`)** | `+2` | Apresiasi kehadiran fisik tepat waktu di lapangan. |
| **Sportif / Pujian Rekan (`COMMENDED`)** | `+5` | Diberikan jika menerima bintang 5 sportivitas dari mayoritas peserta sesi. |
| **Terlambat > 15 Menit (`LATE_ARRIVAL`)** | `-5` | Peringatan keterlambatan yang mengganggu jalannya pertandingan. |
| **Mangkir / No-Show (`NO_SHOW`)** | `-20` | Penalti keras karena menyebabkan kekurangan orang secara mendadak. |
| **Pelanggaran Terverifikasi (`TOXIC_REPORT`)** | `-25` | Penalti laporan perilaku buruk yang divalidasi oleh moderator/admin. |

### 1.2. Ambang Batas Fungsional (Threshold Enforcements)
1. **Skor $\ge 80$ (Kategori EXCELLENT):**  
   Hak penuh untuk membuat sesi baru (*Host*), mendaftar di seluruh sesi mabar publik, dan menjadi inisiator split-bill.
2. **Skor $51 - 79$ (Kategori WARNING):**  
   Pengguna **dikunci dari membuat sesi (*Host Lock*)**. Hanya diizinkan bergabung ke sesi orang lain untuk memulihkan skor reputasinya kembali ke angka 80+.
3. **Skor $\le 50$ (Kategori SUSPENDED):**  
   Akun **dibekukan otomatis (`is_suspended = true`)**. Seluruh hak akses interaksi sesi dan matchmaking dinonaktifkan sementara hingga melalui proses banding admin.

---

## 2. Enum Status Terstandarisasi

Untuk menjaga integritas state machine, platform membakukan enum status berikut:

### 2.1. Status Sesi Mabar (`sessions.status`)
* `OPEN`: Sesi aktif, kuota slot masih tersedia, pendaftaran dibuka.
* `FULL`: Seluruh slot kuota fisik telah terpenuhi (`active_count == max_slots`).
* `PLAYING`: Waktu mulai telah tiba, sesi sedang berlangsung di lapangan/game.
* `COMPLETED`: Pertandingan selesai, sistem membuka sesi evaluasi peer-review.
* `CANCELLED`: Dibatalkan oleh host atau kuota minimum tidak terpenuhi saat H-1 jam.

### 2.2. Status Peserta Sesi (`session_participants.status`)
* `JOINED`: Terdaftar aktif menempati nomor slot fisik (berlaku *partial unique index*).
* `CANCELLED`: Membatalkan keikutsertaan sebelum batas waktu toleransi.
* `ATTENDED`: Terverifikasi hadir fisik di venue oleh host/rekan tim.
* `NO_SHOW`: Tidak hadir tanpa konfirmasi (memicu penalti `-20` Karma).

---

## 3. Spesifikasi Algoritma Balanced Team Splitter (FR-07)

### 3.1. Formula Skor Kekuatan Efektif (Effective Power)
Untuk membagi tim secara adil, sistem menggabungkan keahlian teknis (Skill Rating) dengan komitmen sportivitas (Karma Score):

$$\text{Effective Power} = (\text{Skill Rating} \times 0.8) + (\text{Karma Score} \times 15 \times 0.2)$$

* Normalisasi faktor 15 digunakan agar skala Karma (0–100) setara dengan bobot Skill Rating (~1000–2000).

### 3.2. Prosedur Pembagian (Greedy Snake Allocation)
1. Urutkan daftar peserta secara menurun (*descending*) berdasarkan $\text{Effective Power}$.
2. Lakukan iterasi pemain, tempatkan pemain ke tim yang saat itu memiliki akumulasi kekuatan lebih rendah ($\sum \text{Power}_A \le \sum \text{Power}_B \rightarrow \text{Team A}$, selainnya $\rightarrow \text{Team B}$).
3. Algoritma menjamin selisih rating antar kubu seminimal mungkin ($\text{Rating Diff} \to 0$).
