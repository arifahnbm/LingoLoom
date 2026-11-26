import { supabaseAdmin } from '../config/supabase';
import { AppSettingsRow, Profile, QuotaSummary } from '../types/models';
import {
  AI_MAINTENANCE_MESSAGE,
  getAppSettings,
  getEffectivePlan,
} from '../utils/planGuard';

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrResetProfile(userId: string): Promise<Profile> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('[getOrResetProfile] Supabase error:', error);
    throw new Error(error?.message || 'Profil pengguna tidak ditemukan.');
  }

  const today = getTodayIsoDate();
  if (profile.last_ai_reset_date !== today) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        ai_autofill_used_today: 0,
        last_ai_reset_date: today,
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (!updateError && updated) {
      return updated as Profile;
    }
  }

  return profile as Profile;
}

export async function getWeeklyStoryCount(userId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('micro_stories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo);

  if (error) {
    console.error('[Quota] Failed to count weekly micro_stories:', error);
    return 0;
  }

  return count ?? 0;
}

export async function getDailyStoryCount(userId: string): Promise<number> {
  const startOfTodayUtc = `${getTodayIsoDate()}T00:00:00.000Z`;
  const { count, error } = await supabaseAdmin
    .from('micro_stories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfTodayUtc);

  if (error) {
    console.error('[Quota] Failed to count daily micro_stories:', error);
    return 0;
  }

  return count ?? 0;
}

export async function getQuotaSummary(
  userId: string,
  prefetchedSettings?: AppSettingsRow
): Promise<QuotaSummary> {
  const [profile, settings, usedStoriesThisWeek, usedStoriesToday] = await Promise.all([
    getOrResetProfile(userId),
    prefetchedSettings ? Promise.resolve(prefetchedSettings) : getAppSettings(),
    getWeeklyStoryCount(userId),
    getDailyStoryCount(userId),
  ]);

  const effectivePlan = getEffectivePlan(profile);
  const isPro = effectivePlan === 'pro';

  const autofillLimit = isPro
    ? settings.pro_autofill_daily_fup
    : settings.free_autofill_daily_limit;

  const storyUsed = isPro ? usedStoriesToday : usedStoriesThisWeek;
  const storyLimit = isPro
    ? settings.pro_story_daily_fup
    : settings.free_story_weekly_limit;

  return {
    plan: effectivePlan,
    is_pro: isPro,
    plan_expires_at: isPro ? profile.plan_expires_at || null : null,
    ai_enabled: settings.ai_enabled,
    autofill: {
      used_today: profile.ai_autofill_used_today,
      daily_limit: autofillLimit,
      remaining: Math.max(0, autofillLimit - profile.ai_autofill_used_today),
    },
    micro_stories: {
      used_this_week: storyUsed,
      weekly_limit: storyLimit,
      remaining: Math.max(0, storyLimit - storyUsed),
    },
  };
}

export async function checkAutoFillQuota(userId: string): Promise<{
  allowed: boolean;
  status?: number;
  code?: string;
  quota: QuotaSummary;
  settings: AppSettingsRow;
  message?: string;
}> {
  const settings = await getAppSettings();
  const quota = await getQuotaSummary(userId, settings);

  if (!settings.ai_enabled) {
    return {
      allowed: false,
      status: 503,
      code: 'AI_DISABLED',
      quota,
      settings,
      message: AI_MAINTENANCE_MESSAGE,
    };
  }

  if ((quota.autofill.remaining ?? 0) <= 0) {
    const message = quota.is_pro
      ? `Batas wajar harian (Fair Usage Policy) AI Auto-Fill Pro (${settings.pro_autofill_daily_fup}x/hari) telah tercapai. Kuota akan otomatis reset besok!`
      : `Kuota AI Auto-Fill harian paket Gratis (${settings.free_autofill_daily_limit}x/hari) sudah habis. Upgrade ke Pro untuk kuota lebih besar, atau isi kartu secara manual!`;

    return {
      allowed: false,
      status: 429,
      code: 'QUOTA_EXCEEDED',
      quota,
      settings,
      message,
    };
  }

  return { allowed: true, quota, settings };
}

export async function incrementAutoFillUsage(userId: string): Promise<void> {
  const profile = await getOrResetProfile(userId);
  await supabaseAdmin
    .from('profiles')
    .update({
      ai_autofill_used_today: profile.ai_autofill_used_today + 1,
      last_ai_reset_date: getTodayIsoDate(),
    })
    .eq('id', userId);
}

export async function checkMicroStoryQuota(userId: string): Promise<{
  allowed: boolean;
  status?: number;
  code?: string;
  quota: QuotaSummary;
  settings: AppSettingsRow;
  message?: string;
}> {
  const settings = await getAppSettings();
  const quota = await getQuotaSummary(userId, settings);

  if (!settings.ai_enabled) {
    return {
      allowed: false,
      status: 503,
      code: 'AI_DISABLED',
      quota,
      settings,
      message: AI_MAINTENANCE_MESSAGE,
    };
  }

  if ((quota.micro_stories.remaining ?? 0) <= 0) {
    const message = quota.is_pro
      ? `Batas wajar harian Micro-Story Pro (${settings.pro_story_daily_fup}x/hari) telah tercapai. Coba lagi besok!`
      : `Kuota Micro-Story paket Gratis (${settings.free_story_weekly_limit}x/minggu) sudah terpakai. Upgrade ke LingoLoop Pro untuk membuat cerita AI lebih banyak!`;

    return {
      allowed: false,
      status: 429,
      code: 'QUOTA_EXCEEDED',
      quota,
      settings,
      message,
    };
  }

  return { allowed: true, quota, settings };
}
