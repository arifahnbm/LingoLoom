-- ============================================================================
-- LingoLoom — Supabase PostgreSQL Schema, Triggers, Indexes & Row Level Security
-- ============================================================================
-- Jalankan file ini di Supabase SQL Editor untuk menyiapkan seluruh skema database.

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Tables
-- ============================================================================

-- A. Profiles (terhubung otomatis dengan auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  streak_count INTEGER NOT NULL DEFAULT 0 CHECK (streak_count >= 0),
  last_study_date DATE,
  ai_autofill_used_today INTEGER NOT NULL DEFAULT 0 CHECK (ai_autofill_used_today >= 0),
  last_ai_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. Decks (koleksi kosa kata milik pengguna)
CREATE TABLE IF NOT EXISTS public.decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color_theme TEXT NOT NULL DEFAULT 'emerald',
  icon TEXT NOT NULL DEFAULT 'book-open',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. Cards (flashcard kosa kata + metadata SM-2 Spaced Repetition)
CREATE TABLE IF NOT EXISTS public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  phonetic TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  meaning_id TEXT NOT NULL,
  synonyms JSONB NOT NULL DEFAULT '[]'::JSONB,
  examples JSONB NOT NULL DEFAULT '[]'::JSONB,
  audio_url TEXT,
  interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  repetitions INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  lapses INTEGER NOT NULL DEFAULT 0 CHECK (lapses >= 0),
  next_review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. Global Vocab Cache (menghemat kuota AI lintas pengguna)
CREATE TABLE IF NOT EXISTS public.vocab_cache (
  word TEXT PRIMARY KEY,
  phonetic TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  meaning_id TEXT NOT NULL,
  synonyms JSONB NOT NULL DEFAULT '[]'::JSONB,
  examples JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. Contextual Micro-Stories
CREATE TABLE IF NOT EXISTS public.micro_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  story_en TEXT NOT NULL,
  story_id TEXT NOT NULL,
  target_words JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F. Review Logs (riwayat evaluasi SM-2)
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Indexes untuk Performa Query Cepat
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON public.cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_due ON public.cards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_cards_user_lapses ON public.cards(user_id, lapses DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_stories_user_created ON public.micro_stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed ON public.review_logs(user_id, reviewed_at DESC);

-- ============================================================================
-- 4. Functions & Triggers
-- ============================================================================

-- Trigger untuk memperbarui kolom updated_at pada profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger otomatis membuat profil & 1 deck pemula ketika user baru mendaftar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  starter_deck_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Buat 1 deck starter agar pengguna baru langsung siap belajar
  INSERT INTO public.decks (user_id, title, description, color_theme, icon)
  VALUES (
    NEW.id,
    'Kosa Kata Harian',
    'Kumpulan kata bahasa Inggris yang sering dipakai dalam percakapan sehari-hari.',
    'emerald',
    'sparkles'
  )
  RETURNING id INTO starter_deck_id;

  -- Tambahkan 3 kartu contoh agar pengguna bisa langsung mencoba review
  INSERT INTO public.cards (deck_id, user_id, word, phonetic, part_of_speech, meaning_id, synonyms, examples)
  VALUES
    (
      starter_deck_id,
      NEW.id,
      'Resilient',
      '/rɪˈzɪl.jənt/',
      'adjective',
      'Tangguh; cepat pulih dari kesulitan',
      '["tough", "adaptable", "strong"]'::JSONB,
      '[
        {"en": "She stayed resilient even after facing many setbacks.", "id": "Dia tetap tangguh meskipun menghadapi banyak rintangan."},
        {"en": "Small businesses proved remarkably resilient this year.", "id": "Usaha kecil terbukti sangat tangguh tahun ini."}
      ]'::JSONB
    ),
    (
      starter_deck_id,
      NEW.id,
      'Eloquent',
      '/ˈel.ə.kwənt/',
      'adjective',
      'Fasih dan meyakinkan dalam berbicara atau menulis',
      '["articulate", "expressive", "fluent"]'::JSONB,
      '[
        {"en": "He gave an eloquent speech about the future of education.", "id": "Dia menyampaikan pidato yang fasih tentang masa depan pendidikan."},
        {"en": "Her eloquent writing made the complex topic easy to understand.", "id": "Tulisannya yang lugas membuat topik rumit mudah dipahami."}
      ]'::JSONB
    ),
    (
      starter_deck_id,
      NEW.id,
      'Meticulous',
      '/məˈtɪk.jə.ləs/',
      'adjective',
      'Sangat teliti dan memperhatikan detail kecil',
      '["thorough", "careful", "precise"]'::JSONB,
      '[
        {"en": "The architect is meticulous about every measurement.", "id": "Arsitek itu sangat teliti terhadap setiap ukuran."},
        {"en": "Meticulous planning helped the event run without a hitch.", "id": "Perencanaan yang sangat teliti membantu acara berjalan lancar."}
      ]'::JSONB
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Decks Policies
DROP POLICY IF EXISTS "decks_select_own_or_public" ON public.decks;
CREATE POLICY "decks_select_own_or_public" ON public.decks
  FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

DROP POLICY IF EXISTS "decks_insert_own" ON public.decks;
CREATE POLICY "decks_insert_own" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "decks_update_own" ON public.decks;
CREATE POLICY "decks_update_own" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "decks_delete_own" ON public.decks;
CREATE POLICY "decks_delete_own" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

-- Cards Policies
DROP POLICY IF EXISTS "cards_select_own_or_public_deck" ON public.cards;
CREATE POLICY "cards_select_own_or_public_deck" ON public.cards
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.id = cards.deck_id AND d.is_public = TRUE
    )
  );

DROP POLICY IF EXISTS "cards_insert_own" ON public.cards;
CREATE POLICY "cards_insert_own" ON public.cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cards_update_own" ON public.cards;
CREATE POLICY "cards_update_own" ON public.cards
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cards_delete_own" ON public.cards;
CREATE POLICY "cards_delete_own" ON public.cards
  FOR DELETE USING (auth.uid() = user_id);

-- Vocab Cache Policies (read-only untuk user terautentikasi; write lewat Backend service_role)
DROP POLICY IF EXISTS "vocab_cache_select_authenticated" ON public.vocab_cache;
CREATE POLICY "vocab_cache_select_authenticated" ON public.vocab_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- Micro Stories Policies
DROP POLICY IF EXISTS "micro_stories_select_own" ON public.micro_stories;
CREATE POLICY "micro_stories_select_own" ON public.micro_stories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "micro_stories_insert_own" ON public.micro_stories;
CREATE POLICY "micro_stories_insert_own" ON public.micro_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "micro_stories_delete_own" ON public.micro_stories;
CREATE POLICY "micro_stories_delete_own" ON public.micro_stories
  FOR DELETE USING (auth.uid() = user_id);

-- Review Logs Policies
DROP POLICY IF EXISTS "review_logs_select_own" ON public.review_logs;
CREATE POLICY "review_logs_select_own" ON public.review_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "review_logs_insert_own" ON public.review_logs;
CREATE POLICY "review_logs_insert_own" ON public.review_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
