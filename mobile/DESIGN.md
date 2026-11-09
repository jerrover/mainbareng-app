# Langui Fusion — Mobile Design System & UI Tokens

Dokumentasi spesifikasi desain resmi untuk aplikasi mobile **Mabar (MainBareng)**. Seluruh implementasi antarmuka wajib mengacu pada token dan aturan di bawah ini serta dicocokkan dengan **Figma Suite (kB2Rxyg0JdTf9qABRR8uxZ, Mabar Master (Draft))**.

---

## 🎨 1. Color Palette & Semantic Tokens

### Brand Core
| Token | Nilai Hex / RGBA | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.primary` | `#D5FF40` | **Volt Neon** — CTA primer, status aktif, highlight rating |
| `THEME.colors.primaryLight` | `#E4FF75` | Hover/Pressed state untuk aksen volt |
| `THEME.colors.primaryMuted` | `rgba(213, 255, 64, 0.12)` | Badge pill background, tab indicator glow |

### Secondary Neutral
| Token | Nilai Hex / RGBA | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.secondary` | `#C0C2B8` | **Ash Sage** — Teks sekunder, label atribut, border pasif |
| `THEME.colors.secondaryMuted` | `rgba(192, 194, 184, 0.15)` | Surface nested subtle |

### Surfaces & Backgrounds (Dark Onyx)
| Token | Nilai Hex / RGBA | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.background` | `#0A0B0E` | **Deep Onyx** — Canvas background utama aplikasi |
| `THEME.colors.card` | `#12141A` | **Bento Surface** — Kartu bento level 1, card list |
| `THEME.colors.cardElevated` | `#1A1D24` | Input field box, modal dialog container, bottom sheet |
| `THEME.colors.cardGlass` | `rgba(18, 20, 26, 0.85)` | Glassmorphism surface bar & header |

### Typography Colors
| Token | Nilai Hex | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.text` | `#FFFFFF` | Teks judul, heading, nilai penting |
| `THEME.colors.textSecondary` | `#C0C2B8` | Subjudul, deskripsi, caption |
| `THEME.colors.textMuted` | `#6B7280` | Placeholder, divider label, teks non-aktif |
| `THEME.colors.textOnPrimary` | `#0A0B0E` | **Hitam pekat** — Seluruh teks di atas tombol Volt `#D5FF40` |

### Borders & Dividers
| Token | Nilai RGBA / Hex | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.cardBorder` | `rgba(192, 194, 184, 0.18)` | Border default kartu bento, chip, dan circular button |
| `THEME.colors.border` | `rgba(255, 255, 255, 0.08)` | Divider horizontal antar baris / section |
| `THEME.colors.borderActive` | `#D5FF40` | Border state fokus, slot terseleksi |

### Status Colors
| Token | Nilai Hex | Peruntukan / Semantik |
| :--- | :--- | :--- |
| `THEME.colors.success` | `#00F59B` | **Mint Emerald** — Slot tersedia, on-time, verifikasi sukses |
| `THEME.colors.warning` | `#FF9F0A` | **Amber** — Kuota hampir habis, peringatan karma 51–79 |
| `THEME.colors.danger` | `#FF3B30` | **Crimson** — Akun dibekukan, penalti mangkir, tombol destruktif |
| `THEME.colors.accent` | `#5E5CE6` | **Electric Indigo** — Link aksi, tag esport, OVR badge |

---

## 🔤 2. Typography Scale (Font: Sora)

> [!IMPORTANT]
> **Aturan Android:** Jangan pernah memasangkan `fontFamily` kustom dengan `fontWeight` CSS secara bersamaan di React Native Android karena memicu *faux-bold distortion*. Selalu gunakan font name spesifik (`Sora-Bold`, `Sora-SemiBold`, dsb) dan sertakan `includeFontPadding: false`.

| Style Token | Font Family | Size | Weight | Letter Spacing | Peruntukan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `THEME.typography.h1` | `Sora-ExtraBold` | `24px` | `800` | `-0.5px` | Hero title, login welcome screen |
| `THEME.typography.h2` | `Sora-Bold` | `18px` | `700` | `-0.3px` | Section header, modal title |
| `THEME.typography.h3` | `Sora-Bold` | `15px` | `700` | `0px` | Card title sesi mabar |
| `THEME.typography.subtitle`| `Sora-SemiBold` | `13px` | `600` | `0.2px` | Subtitle profil, form label |
| `THEME.typography.body` | `Sora-Regular` | `13px` | `400` | `0px` | Body text, input text, deskripsi sesi |
| `THEME.typography.button` | `Sora-Bold` | `14px` | `700` | `0.5px` | Teks tombol CTA primer & sekunder |
| `THEME.typography.caption` | `Sora-SemiBold` | `11px` | `600` | `0.4px` | Tag rating, slot counter, badge waktu |
| `THEME.typography.micro` | `Sora-Bold` | `10px` | `700` | `0.8px` | Uppercase eyebrow, pill label, credit tier |

---

## 📐 3. Corner Radius Scale

| Token | Nilai | Implementasi Elemen |
| :--- | :--- | :--- |
| `THEME.radius.sm` | `8px` | Badge OVR, pips kuota, rating tag kecil |
| `THEME.radius.md` | `12px` | Chip filter kategori, input field box, secondary button |
| `THEME.radius.lg` | `16px` | Bento grid card, match pass container, modal container |
| `THEME.radius.xl` | `24px` | Bottom sheet modal, drawer menu |
| `THEME.radius.full`| `9999px` | Circular nav button (`40x40`), pill badge, user avatar |

---

## 📏 4. Spatial & Layout Metric

- **Design Target Viewport:** `393 × 852 pt` (Figma iPhone 16 / Android base)
- **Status Bar Height:** `44px`
- **Bottom Dock Nav Height:** `78px` (Floating capsule dock)
- **Screen Padding Horizontal:** `16px` (Default layout gutter)
- **Base Grid Unit:** `8px` (`4px`, `8px`, `12px`, `16px`, `24px`)

---

## 🧩 5. Specific UI Components Spec

### Primary CTA Button (`THEME.components.buttonPrimary`)
- **Height:** `48px`
- **Background:** `#D5FF40` (Volt Neon)
- **Text Color:** `#0A0B0E` (Hitam Pekat)
- **Border Radius:** `12px`
- **Typography:** `Sora-Bold` 14px, letter-spacing `0.5px`

### Floating Action Button (`THEME.components.fabButton`)
- **Dimensions:** `44 × 44 px`
- **Background:** `#D5FF40`
- **Icon Color:** `#0A0B0E`
- **Border Radius:** `9999px` (Circle)

### Slot Kuota Pips — Futsal 5v5 (`THEME.components.futsalPips`)
- **Jumlah Pips:** `10` pips (2 tim × 5 pemain)
- **Tinggi Pips:** `5px`
- **Jarak Antar Pips (Gap):** `4px`
- **Border Radius:** `2.5px`
- **Active Fill:** `#D5FF40`
- **Empty Fill:** `rgba(255, 255, 255, 0.1)`

### Slot Kuota Pips — Badminton Ganda (`THEME.components.badmintonPips`)
- **Jumlah Pips:** `4` pips (2 kubu × 2 pemain)
- **Tinggi Pips:** `6px`
- **Jarak Antar Pips (Gap):** `6px`
- **Border Radius:** `3px`
- **Active Fill:** `#00F59B` (Mint Emerald)
- **Empty Fill:** `rgba(255, 255, 255, 0.1)`

---

## 🛡️ Aturan Coding untuk Developer & AI Agent
1. **Dilarang keras menggunakan *hardcoded hex color*:** Seluruh warna wajib mengimpor `THEME.colors.*`.
2. **Gunakan `THEME.radius.*` dan `THEME.spatial.*`:** Jangan memasang angka acak seperti `borderRadius: 13` atau `padding: 17`.
3. **Setiap modifikasi UI wajib dicek silang ke Figma:** File key `kB2Rxyg0JdTf9qABRR8uxZ`, Mabar Master (Draft).
