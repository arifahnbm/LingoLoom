import { supabaseAdmin } from '../config/supabase';
import { AppSettingsRow, Profile, UserPlan } from '../types/models';
import { decrypt } from './crypto';

export const AI_MAINTENANCE_MESSAGE =
  'Fitur AI sedang dalam pemeliharaan sementara. Kamu tetap bisa membuat dan belajar flashcard secara manual.';

export const DEFAULT_APP_SETTINGS: AppSettingsRow = {
  id: 1,
  ai_enabled: true,
  ai_model: 'gemini-2.5-flash',
  encrypted_gemini_api_key: null,
  free_autofill_daily_limit: Number(process.env.FREE_DAILY_AUTOFILL_LIMIT) || 5,
  free_story_weekly_limit: Number(process.env.FREE_WEEKLY_STORY_LIMIT) || 1,
  pro_autofill_daily_fup: 100,
  pro_story_daily_fup: 5,
  whatsapp_admin_number: '6281234567890',
  pro_price_idr: 29000,
  updated_at: new Date().toISOString(),
};

/**
 * Mengambil pengaturan sistem singleton (`id = 1`) dari `app_settings`.
 * Jatuh ke default aman jika tabel belum dimigrasi.
 */
export async function getAppSettings(): Promise<AppSettingsRow> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  return data as AppSettingsRow;
}

/**
 * Mendekripsi custom API key jika tersedia di `app_settings` tanpa pernah mencatat key ke log.
 */
export function resolveAiRuntimeConfig(settings: AppSettingsRow): {
  model: string;
  apiKey?: string;
} {
  const model = settings.ai_model?.trim() || 'gemini-2.5-flash';

  if (!settings.encrypted_gemini_api_key) {
    return { model };
  }

  try {
    const apiKey = decrypt(settings.encrypted_gemini_api_key).trim();
    return apiKey ? { model, apiKey } : { model };
  } catch {
    console.error('[planGuard] Gagal mendekripsi custom Gemini API key. Menggunakan fallback ENV.');
    return { model };
  }
}

/**
 * Lazy Auto-Expiry:
 * - Jika `plan === 'pro'` dan `plan_expires_at === null` -> Pro Lifetime ('pro').
 * - Jika `plan === 'pro'` dan `plan_expires_at` sudah lewat -> kembalikan 'free'
 *   dan secara asinkron perbarui `plan = 'free'` di database via service_role.
 */
export function getEffectivePlan(
  profile: Pick<Profile, 'id' | 'plan' | 'plan_expires_at'>
): UserPlan {
  if (profile.plan !== 'pro') {
    return 'free';
  }

  if (!profile.plan_expires_at) {
    // Pro Lifetime
    return 'pro';
  }

  const expiresAt = new Date(profile.plan_expires_at).getTime();
  if (Number.isNaN(expiresAt)) {
    return 'pro';
  }

  if (expiresAt <= Date.now()) {
    // Asinkron downgrade ke free tanpa memblokir request saat ini
    void Promise.resolve(
      supabaseAdmin
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', profile.id)
    ).catch((err) => {
      console.error('[planGuard] Gagal auto-downgrade expired Pro user:', err);
    });
    return 'free';
  }

  return 'pro';
}

/**
 * Mencatat setiap pemanggilan AI (cache hit maupun cache miss) ke `ai_usage_logs`.
 */
export async function logAiUsage(
  userId: string,
  feature: 'auto_fill' | 'micro_story',
  cacheHit: boolean
): Promise<void> {
  try {
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: userId,
      feature,
      cache_hit: cacheHit,
    });
  } catch (err) {
    console.error('[planGuard] Gagal mencatat ai_usage_logs:', err);
  }
}
