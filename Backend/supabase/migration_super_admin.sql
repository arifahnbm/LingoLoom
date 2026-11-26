-- ============================================================================
-- LingoLoop — Migrasi Super Admin, Monetisasi Manual WA, Pengaturan AI Dinamis
-- & Proteksi Keamanan RLS (Aman dijalankan berulang / Idempotent)
-- ============================================================================

-- 1. Update Tabel `profiles` (Role & Expiry Langganan Pro)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'super_admin'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires ON public.profiles(plan, plan_expires_at);

-- Keamanan Kritis: Trigger BEFORE UPDATE ON profiles
-- Memblokir modifikasi kolom role, plan, dan plan_expires_at dari client biasa (anon/authenticated)
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- Hanya service_role (Backend) atau superuser SQL Editor (postgres/supabase_admin)
  -- yang diizinkan mengubah kolom role, plan, atau plan_expires_at.
  IF jwt_role IS DISTINCT FROM 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
      RAISE EXCEPTION 'Akses ditolak: kolom role, plan, dan plan_expires_at hanya boleh diubah oleh server terotorisasi.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();

-- 2. Persiapan Masa Depan di Tabel `cards` (Fase Browser Extension)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS source_sentence TEXT NULL;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS source_url TEXT NULL;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'web';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cards_source_type_check'
      AND conrelid = 'public.cards'::regclass
  ) THEN
    ALTER TABLE public.cards
      ADD CONSTRAINT cards_source_type_check CHECK (source_type IN ('web', 'extension'));
  END IF;
END;
$$;

-- 3. Tabel Baru `manual_transactions` (Log Pembayaran via WhatsApp)
CREATE TABLE IF NOT EXISTS public.manual_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan_granted TEXT NOT NULL CHECK (
    plan_granted IN ('pro_monthly', 'pro_yearly', 'pro_lifetime', 'downgrade_free')
  ),
  duration_days INT NULL,
  amount_idr INT NOT NULL DEFAULT 0 CHECK (amount_idr >= 0),
  payment_method TEXT NOT NULL DEFAULT 'WhatsApp Manual',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_transactions_user_id
  ON public.manual_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_transactions_created_at
  ON public.manual_transactions(created_at DESC);

ALTER TABLE public.manual_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_transactions_select_own" ON public.manual_transactions;
CREATE POLICY "manual_transactions_select_own" ON public.manual_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- 4. Tabel Baru `app_settings` (Singleton Row id = 1 — Pengaturan Sistem & AI)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  encrypted_gemini_api_key TEXT NULL,
  free_autofill_daily_limit INT NOT NULL DEFAULT 5 CHECK (free_autofill_daily_limit >= 0),
  free_story_weekly_limit INT NOT NULL DEFAULT 1 CHECK (free_story_weekly_limit >= 0),
  pro_autofill_daily_fup INT NOT NULL DEFAULT 100 CHECK (pro_autofill_daily_fup >= 0),
  pro_story_daily_fup INT NOT NULL DEFAULT 5 CHECK (pro_story_daily_fup >= 0),
  whatsapp_admin_number TEXT NOT NULL DEFAULT '6281234567890',
  pro_price_idr INT NOT NULL DEFAULT 29000 CHECK (pro_price_idr >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Aktifkan RLS & blokir total akses baca/tulis publik (hanya service_role yang boleh akses)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_settings FROM PUBLIC, anon, authenticated;

-- 5. Tabel Baru `ai_usage_logs` (Monitoring Trafik AI & Rasio Hemat Cache)
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL CHECK (feature IN ('auto_fill', 'micro_story')),
  cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at
  ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_feature_date
  ON public.ai_usage_logs(user_id, feature, created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_logs FROM PUBLIC, anon, authenticated;

-- 6. Role Grants Eksplisit
GRANT ALL PRIVILEGES ON public.manual_transactions TO service_role;
GRANT SELECT ON public.manual_transactions TO authenticated;

GRANT ALL PRIVILEGES ON public.app_settings TO service_role;
GRANT ALL PRIVILEGES ON public.ai_usage_logs TO service_role;
