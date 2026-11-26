# LingoLoom — Belajar Kosa Kata Inggris Tanpa Gampang Lupa

**LingoLoom** adalah aplikasi web belajar kosa kata bahasa Inggris modern dengan nuansa kartu *tactile* 3D cerah ala Duolingo, menggabungkan:

- **Unlimited Basic Flashcards + SRS SM-2:** Algoritma *Spaced Repetition* (`again`, `hard`, `good`, `easy`) untuk menjadwalkan ulang kata tepat sebelum kamu lupa.
- **AI Auto-Fill 5 Detik + Global Vocab Caching:** Ketik 1 kata bahasa Inggris → AI (Google Gemini) otomatis mengisi phonetic IPA, jenis kata, arti bahasa Indonesia, sinonim, dan 2 contoh kalimat. Hasil disimpan ke tabel `vocab_cache` di Supabase untuk menghemat kuota API lintas pengguna.
- **Contextual Micro-Stories:** AI merangkai 5–7 kata dengan tingkat lupa (`lapses`) tertinggi atau kata terbaru menjadi cerita pendek bahasa Inggris dengan *interactive tooltip*, terjemahan bahasa Indonesia, dan *mini audio player*.
- **Gratis Audio Pelafalan US & UK:** Menggunakan Web Speech API (`window.speechSynthesis`) instan tanpa biaya API dan siap dihubungkan dengan URL audio dari Supabase Storage.

---

## Struktur Folder (Monorepo)

```text
LingoLoom/
├── Frontend/                  # Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion (Port 3000)
│   ├── src/app/               # Landing, Auth (/login, /register), Dashboard, Zen Study, Micro-Stories
│   ├── src/components/        # Komponen Tactile 3D, Flashcard3D, QuickAddVocab, InteractiveStoryReader
│   └── .env.example
├── Backend/                   # Node.js + Express + TypeScript + Supabase SDK (Port 4000)
│   ├── api/index.ts           # Entry point Vercel Serverless
│   ├── supabase/schema.sql    # SQL Migration lengkap (tabel, index, trigger, RLS)
│   ├── src/services/          # SM-2 SRS Engine, Freemium Quota Guard, AI Client
│   └── .env.example
├── AI/                        # Microservice AI Node.js + Express + TypeScript + @google/genai (Port 5000)
│   ├── api/index.ts           # Entry point Vercel Serverless
│   ├── src/services/          # Gemini Structured JSON Output + Mock Fallback
│   └── .env.example
└── README.md
```

---

## Prasyarat

- **Node.js** v20+ dan **npm** v10+
- Akun **Supabase** (gratis di [supabase.com](https://supabase.com))
- Opsional: **Gemini API Key** dari [Google AI Studio](https://aistudio.google.com/apikey) *(jika belum diisi, service `AI/` otomatis memakai fallback mock response yang realistis sehingga seluruh UI tetap bisa langsung diuji coba!)*

---

## 1. Setup Database Supabase

1. Buat project baru di [Supabase Dashboard](https://supabase.com/dashboard).
2. Buka **SQL Editor** → salin seluruh isi file [`Backend/supabase/schema.sql`](Backend/supabase/schema.sql) → klik **Run**.
   - Script ini akan membuat tabel `profiles`, `decks`, `cards`, `vocab_cache`, `micro_stories`, `review_logs`, seluruh index, trigger otomatis pembuatan profil + 1 deck starter saat user mendaftar, dan kebijakan **Row Level Security (RLS)**.
3. *(Opsional — untuk Google Login)* Buka **Authentication → Providers → Google**, aktifkan provider Google, lalu tambahkan URL redirect:
   - Lokal: `http://localhost:3000/auth/callback`
   - Produksi: `https://domain-kamu.vercel.app/auth/callback`

---

## 2. Konfigurasi Environment Variables

Salin file `.env.example` di masing-masing folder:

### A. AI Microservice (`LingoLoom/AI/.env`)
```bash
cp AI/.env.example AI/.env
```
Isi `GEMINI_API_KEY` (atau biarkan kosong untuk mode pratinjau *mock fallback*):
```env
PORT=5000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### B. Backend REST API (`LingoLoom/Backend/.env`)
```bash
cp Backend/.env.example Backend/.env
```
Isi kredensial dari **Supabase Project Settings → API**:
```env
PORT=4000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:5000
FREE_DAILY_AUTOFILL_LIMIT=5
FREE_WEEKLY_STORY_LIMIT=1
```

### C. Frontend Web App (`LingoLoom/Frontend/.env.local`)
```bash
cp Frontend/.env.example Frontend/.env.local
```
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 3. Instalasi Dependensi

Jalankan perintah berikut dari root folder `LingoLoom/`:

```bash
npm --prefix AI install
npm --prefix Backend install
npm --prefix Frontend install
```

---

## 4. Menjalankan Ketiga Service Secara Bersamaan di Lokal

### Cara Cepat (Dari Root `LingoLoom/`)
Kamu bisa pakai `pnpm run` atau `npm run` langsung di terminal dari folder root `LingoLoom/`:

```bash
pnpm run env       # Salin .env.example -> .env / .env.local (tidak menimpa file yang sudah ada)
pnpm run ai        # Jalankan AI Service (Port 5000)
pnpm run backend   # Jalankan Backend API (Port 4000)
pnpm run frontend  # Jalankan Frontend Web (Port 3000)
pnpm run dev       # Jalankan ketiga service sekaligus di 1 terminal
pnpm run build     # Typecheck & build ketiga service
```

### Cara Manual (3 Terminal Terpisah)
Buka **3 terminal terpisah** di folder root `LingoLoom/`:

- **Terminal 1 — AI Microservice (Port `5000`):**
  ```bash
  npm --prefix AI run dev
  ```
- **Terminal 2 — Backend REST API (Port `4000`):**
  ```bash
  npm --prefix Backend run dev
  ```
- **Terminal 3 — Frontend Next.js (Port `3000`):**
  ```bash
  npm --prefix Frontend run dev
  ```

Setelah ketiganya berjalan:
- Aplikasi Web: [http://localhost:3000](http://localhost:3000)
- Backend Health Check: [http://localhost:4000/health](http://localhost:4000/health)
- AI Service Health Check: [http://localhost:5000/health](http://localhost:5000/health)

---

## 5. Panduan Deploy ke Vercel

Ketiga folder (`Frontend/`, `Backend/`, dan `AI/`) sudah dilengkapi konfigurasi siap deploy ke **Vercel**:

1. **Deploy `AI/`** sebagai Vercel Project pertama (Root Directory: `AI`). Set environment variable `GEMINI_API_KEY`, `GEMINI_MODEL`, dan `ALLOWED_ORIGINS`.
2. **Deploy `Backend/`** sebagai Vercel Project kedua (Root Directory: `Backend`). Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_URL` (URL deploy AI), dan `FRONTEND_URL` (URL deploy Frontend).
3. **Deploy `Frontend/`** sebagai Vercel Project ketiga (Root Directory: `Frontend`). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` (URL deploy Backend), dan `NEXT_PUBLIC_SITE_URL`.

---

## Shortcut Keyboard di Zen Mode (`/study/[deckId]`)

| Tombol | Aksi |
| --- | --- |
| `Spasi` | Membalik kartu flashcard (depan ↔ belakang) |
| `A` | Memutar audio pelafalan kata |
| `1` | Evaluasi **Lupa** (`again`) |
| `2` | Evaluasi **Susah** (`hard`) |
| `3` | Evaluasi **Ingat** (`good`) |
| `4` | Evaluasi **Mudah** (`easy`) |
