import { supabaseAdmin } from '../config/supabase';
import { Profile, QuotaSummary } from '../types/models';

const FREE_DAILY_AUTOFILL_LIMIT = Number(process.env.FREE_DAILY_AUTOFILL_LIMIT) || 5;
const FREE_WEEKLY_STORY_LIMIT = Number(process.env.FREE_WEEKLY_STORY_LIMIT) || 1;

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

export async function getQuotaSummary(userId: string): Promise<QuotaSummary> {
  const profile = await getOrResetProfile(userId);
  const usedStoriesThisWeek = await getWeeklyStoryCount(userId);
  const isPro = profile.plan === 'pro';

  return {
    plan: profile.plan,
    is_pro: isPro,
    autofill: {
      used_today: profile.ai_autofill_used_today,
      daily_limit: isPro ? null : FREE_DAILY_AUTOFILL_LIMIT,
      remaining: isPro
        ? null
        : Math.max(0, FREE_DAILY_AUTOFILL_LIMIT - profile.ai_autofill_used_today),
    },
    micro_stories: {
      used_this_week: usedStoriesThisWeek,
      weekly_limit: isPro ? null : FREE_WEEKLY_STORY_LIMIT,
      remaining: isPro ? null : Math.max(0, FREE_WEEKLY_STORY_LIMIT - usedStoriesThisWeek),
    },
  };
}

export async function checkAutoFillQuota(userId: string): Promise<{
  allowed: boolean;
  quota: QuotaSummary;
  message?: string;
}> {
  const quota = await getQuotaSummary(userId);
  if (quota.is_pro) {
    return { allowed: true, quota };
  }

  if ((quota.autofill.remaining ?? 0) <= 0) {
    return {
      allowed: false,
      quota,
      message: `Kuota AI Auto-Fill harian paket Gratis (${FREE_DAILY_AUTOFILL_LIMIT}x/hari) sudah habis. Upgrade ke Pro untuk AI Auto-Fill tanpa batas, atau isi kartu secara manual!`,
    };
  }

  return { allowed: true, quota };
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
  quota: QuotaSummary;
  message?: string;
}> {
  const quota = await getQuotaSummary(userId);
  if (quota.is_pro) {
    return { allowed: true, quota };
  }

  if ((quota.micro_stories.remaining ?? 0) <= 0) {
    return {
      allowed: false,
      quota,
      message: `Kuota Micro-Story paket Gratis (${FREE_WEEKLY_STORY_LIMIT}x/minggu) sudah terpakai. Upgrade ke LingoLoop Pro untuk membuat cerita AI tanpa batas!`,
    };
  }

  return { allowed: true, quota };
}
