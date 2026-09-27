# Architecture Decision Record (ADR): Mekanisme Atomic Row Lock & Pencegahan Overbooking Slot Sesi Mabar

**ID Keputusan:** ADR-01 (Deliverable E-23)  
**Status:** Diterima & Diimplementasikan (Accepted & Live in Production)  
**Terkait Fitur:** FR-05 (Pendaftaran Slot Sesi)  
**Terkait Mitigasi Risiko:** R-01 (Race condition / overbooking saat kuota sesi sisa 1 slot)  
**Tanggal:** 27 September 2026  
**Penulis:** Tim Engineering Mabar (Kelompok 2 IF670)

---

## 1. Konteks Masalah & Kebutuhan Bisnis

Pada aplikasi olahraga dan gaming bersama (Mabar), kuota slot pemain bersifat terbatas fisik (misal: tepat 10 pemain untuk futsal 5 vs 5, atau 10 pemain untuk kustom match Valorant).

Tantangan teknis utama timbul ketika sebuah sesi menyisakan **1 slot terakhir**, dan terdapat dua atau lebih pengguna yang menekan tombol *"Gabung Sesi"* pada milidetik yang bersamaan (*concurrent burst traffic*):
* **Potensi Kegagalan:** Jika backend membaca jumlah peserta (`SELECT COUNT(*)`) secara non-atomik di layer aplikasi, kedua permintaan akan membaca bahwa sisa slot masih tersedia 1, lalu keduanya melakukan `INSERT` ke database. Akibatnya terjadi **overbooking** (11 pemain pada sesi berkapasitas 10).
* **Dampak Bisnis:** Kekecewaan pengguna di lapangan fisik, rusaknya pembagian tim, dan runtuhnya kepercayaan terhadap platform.

---

## 2. Alternatif Solusi yang Dievaluasi

| Solusi | Kelebihan | Kelemahan | Keputusan |
| :--- | :--- | :--- | :---: |
| **A. Application-level Mutex (Redis / In-Memory Lock)** | Sangat cepat di memori, tidak membebani DB utama. | Menambah dependensi infrastruktur baru (Redis instance), risiko split-brain / state desync saat serverless cold start. | **Ditolak** |
| **B. Optimistic Locking (Versioning Column)** | Tanpa row lock, throughput baca tinggi. | Menghasilkan error rollback yang tinggi (*retry storm*) pada perebutan slot panas, pengalaman pengguna buruk. | **Ditolak** |
| **C. Pessimistic Row Lock (`FOR UPDATE`) + Stored Procedure DB + Partial Unique Index** | **Atomic 100% ACID**, dijamin langsung oleh mesin PostgreSQL, zero external dependency, eksekusi dalam 1 round-trip database. | Lock baris menahan transaksi milidetik pada sesi yang sama (namun terisolasi per sesi, tidak memengaruhi sesi lain). | **DIPILIH (Adopted)** |

---

## 3. Detail Rancangan Teknis & Arsitektur Implementasi

Sistem mengadopsi pendekatan **Pertahanan Berlapis (*Defense-in-Depth*)** di tingkat database Supabase/PostgreSQL:

### Lapisan 1: Atomic Row Lock via PostgreSQL Stored Function (`join_session_atomic`)
Seluruh alur pendaftaran slot dibungkus ke dalam satu transaksi tersimpan (Stored Procedure) dengan mode `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.join_session_atomic(
    p_session_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_user_profile RECORD;
    v_active_count INTEGER;
    v_available_slot INTEGER;
    v_already_joined BOOLEAN;
BEGIN
    -- 1. Kunci baris sesi secara eksklusif (Pessimistic Lock)
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session not found');
    END IF;

    -- Validasi status sesi
    IF v_session.status != 'OPEN' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Session is no longer open for joining');
    END IF;

    -- 2. Validasi profil & threshold skor reputasi
    SELECT * INTO v_user_profile FROM public.profiles WHERE id = p_user_id;
    IF v_user_profile.is_suspended THEN
        RETURN jsonb_build_object('success', false, 'message', 'Account is suspended');
    END IF;

    IF v_user_profile.credit_score < v_session.min_credit_score THEN
        RETURN jsonb_build_object('success', false, 'message', 'Credit score below session requirement');
    END IF;

    -- 3. Hitung peserta aktif di dalam transaksi terkunci
    SELECT COUNT(*) INTO v_active_count
    FROM public.session_participants
    WHERE session_id = p_session_id AND status = 'JOINED';

    IF v_active_count >= v_session.max_slots THEN
        UPDATE public.sessions SET status = 'FULL' WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'message', 'Session is already full');
    END IF;

    -- 4. Alokasikan nomor slot terkecil yang kosong
    SELECT COALESCE(MIN(s.slot_num), v_active_count + 1) INTO v_available_slot
    FROM generate_series(1, v_session.max_slots) AS s(slot_num)
    WHERE s.slot_num NOT IN (
        SELECT slot_number FROM public.session_participants
        WHERE session_id = p_session_id AND status = 'JOINED'
    );

    -- 5. Insert peserta baru
    INSERT INTO public.session_participants (session_id, user_id, slot_number, status)
    VALUES (p_session_id, p_user_id, v_available_slot, 'JOINED');

    -- 6. Jika kuota terpenuhi, otomatis kunci sesi menjadi FULL
    IF v_active_count + 1 >= v_session.max_slots THEN
        UPDATE public.sessions SET status = 'FULL' WHERE id = p_session_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Successfully joined session',
        'slot_number', v_available_slot
    );
END;
$$;
```

### Lapisan 2: Partial Unique Index sebagai Benteng Kegagalan Perangkat Keras
Sebagai jaminan terakhir jika terjadi kegagalan logika atau bypass query ad-hoc, database menerapkan dua buah **Partial Unique Index**:

```sql
-- Mencegah seorang pengguna menempati dua baris aktif di sesi yang sama
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_user_active 
ON public.session_participants (session_id, user_id) 
WHERE status = 'JOINED';

-- Mencegah dua pengguna berbeda mendapatkan nomor slot fisik yang sama
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_slot_active 
ON public.session_participants (session_id, slot_number) 
WHERE status = 'JOINED';
```

---

## 4. Evaluasi & Rencana Uji Beban (Milestone W7)

1. **Jaminan ACID:** `FOR UPDATE` memastikan transaksi konkruen berikutnya antre (*queue*) di tingkat kernel PostgreSQL hingga transaksi pertama selesai (`COMMIT`).
2. **Kesiapan Uji Beban (Rencana W7):** Pada Milestone berikutnya (W7), sistem ini akan diuji menggunakan framework pengujian beban k6 / Autocannon dengan simulasi 50 request konkuren pada 1 slot tersisa untuk memverifikasi rasio keberhasilan tepat 1 sukses dan 49 penolakan teratur (`HTTP 200 { success: false, message: 'Session is already full' }`).

---

## 5. Kesimpulan
Rancangan penguncian slot berbasis `FOR UPDATE` dan *partial unique index* ini telah diintegrasikan ke dalam skrip migrasi `001_baseline_schema.sql` dan aktif berjalan di Supabase live platform Mabar. Dokumen ini memenuhi deliverable **E-23**.
