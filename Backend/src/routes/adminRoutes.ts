import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { decrypt, encrypt, maskApiKey } from '../utils/crypto';
import { getAppSettings, getEffectivePlan } from '../utils/planGuard';
import {
  AppSettingsRow,
  PlanGranted,
  Profile,
  SafeAppSettings,
  SubscriptionAction,
} from '../types/models';

const router = Router();

function toSafeSettings(settings: AppSettingsRow): SafeAppSettings {
  let maskedKey: string | null = null;
  if (settings.encrypted_gemini_api_key) {
    try {
      const decrypted = decrypt(settings.encrypted_gemini_api_key);
      maskedKey = maskApiKey(decrypted);
    } catch {
      maskedKey = '•••••••• (kunci tidak terbaca)';
    }
  }

  return {
    ai_enabled: settings.ai_enabled,
    ai_model: settings.ai_model,
    has_custom_api_key: Boolean(settings.encrypted_gemini_api_key),
    masked_api_key: maskedKey,
    free_autofill_daily_limit: settings.free_autofill_daily_limit,
    free_story_weekly_limit: settings.free_story_weekly_limit,
    pro_autofill_daily_fup: settings.pro_autofill_daily_fup,
    pro_story_daily_fup: settings.pro_story_daily_fup,
    whatsapp_admin_number: settings.whatsapp_admin_number,
    pro_price_idr: settings.pro_price_idr,
    updated_at: settings.updated_at,
  };
}

function isProfileProActive(profile: Pick<Profile, 'plan' | 'plan_expires_at'>): boolean {
  if (profile.plan !== 'pro') return false;
  if (!profile.plan_expires_at) return true; // Lifetime
  return new Date(profile.plan_expires_at).getTime() > Date.now();
}

function isProfileExpiredPro(profile: Pick<Profile, 'plan' | 'plan_expires_at'>): boolean {
  if (!profile.plan_expires_at) return false;
  return new Date(profile.plan_expires_at).getTime() <= Date.now();
}

/**
 * GET /api/admin/stats
 * Ringkasan metrik bisnis, pengguna, pemasukan WA, dan rasio hemat cache AI.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
    ).toISOString();
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
    ).toISOString();

    const [profilesRes, txRes, aiTodayRes, settings] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, plan, plan_expires_at'),
      supabaseAdmin.from('manual_transactions').select('amount_idr, created_at'),
      supabaseAdmin
        .from('ai_usage_logs')
        .select('id, cache_hit')
        .gte('created_at', startOfToday),
      getAppSettings(),
    ]);

    if (profilesRes.error) {
      res.status(500).json({ error: profilesRes.error.message });
      return;
    }

    const profiles = (profilesRes.data || []) as Array<
      Pick<Profile, 'id' | 'plan' | 'plan_expires_at'>
    >;
    const transactions = txRes.data || [];
    const aiLogsToday = aiTodayRes.data || [];

    const totalUsers = profiles.length;
    const activeProUsers = profiles.filter((p) => isProfileProActive(p)).length;

    let revenueTotalIdr = 0;
    let revenueMonthIdr = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount_idr) || 0;
      revenueTotalIdr += amount;
      if (tx.created_at >= startOfMonth) {
        revenueMonthIdr += amount;
      }
    }

    const aiRequestsToday = aiLogsToday.length;
    const cacheHitsToday = aiLogsToday.filter((l) => l.cache_hit).length;
    const cacheHitRate =
      aiRequestsToday > 0 ? Math.round((cacheHitsToday / aiRequestsToday) * 100) : 0;

    res.json({
      total_users: totalUsers,
      active_pro_users: activeProUsers,
      revenue_month_idr: revenueMonthIdr,
      revenue_total_idr: revenueTotalIdr,
      ai_requests_today: aiRequestsToday,
      cache_hits_today: cacheHitsToday,
      cache_hit_rate: cacheHitRate,
      ai_enabled: settings.ai_enabled,
      ai_model: settings.ai_model,
    });
  } catch (error) {
    console.error('[GET /api/admin/stats] Error:', error);
    res.status(500).json({ error: 'Gagal memuat statistik Super Admin.' });
  }
});

/**
 * GET /api/admin/users?search=&plan=
 * Daftar user dengan pencarian email/nama dan filter status (all, free, pro, expired).
 */
router.get('/users', async (req: Request, res: Response) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const planFilter = String(req.query.plan || 'all').trim().toLowerCase();

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, plan, plan_expires_at, streak_count, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const profiles = (data || []) as Array<
      Pick<
        Profile,
        'id' | 'email' | 'full_name' | 'role' | 'plan' | 'plan_expires_at' | 'streak_count' | 'created_at'
      >
    >;

    const enriched = profiles.map((p) => {
      const effectivePlan = getEffectivePlan(p);
      const expired = isProfileExpiredPro(p);
      const isLifetime = effectivePlan === 'pro' && !p.plan_expires_at;
      const daysRemaining =
        effectivePlan === 'pro' && p.plan_expires_at
          ? Math.max(
              0,
              Math.ceil(
                (new Date(p.plan_expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
              )
            )
          : null;

      return {
        ...p,
        effective_plan: effectivePlan,
        is_expired: expired,
        is_lifetime: isLifetime,
        days_remaining: daysRemaining,
      };
    });

    const filtered = enriched.filter((u) => {
      if (search) {
        const matchEmail = (u.email || '').toLowerCase().includes(search);
        const matchName = (u.full_name || '').toLowerCase().includes(search);
        if (!matchEmail && !matchName) return false;
      }

      if (planFilter === 'free') {
        return u.effective_plan === 'free' && !u.is_expired;
      }
      if (planFilter === 'pro') {
        return u.effective_plan === 'pro';
      }
      if (planFilter === 'expired') {
        return u.is_expired;
      }
      return true;
    });

    res.json({ users: filtered });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    res.status(500).json({ error: 'Gagal memuat daftar pengguna.' });
  }
});

const subscriptionSchema = z.object({
  action: z.enum(['pro_30d', 'pro_365d', 'pro_lifetime', 'downgrade_free']),
  amount_idr: z.number().int().min(0).max(100_000_000).optional().default(0),
  notes: z.string().trim().max(300).optional().default(''),
});

/**
 * POST /api/admin/users/:id/subscription
 * Aktivasi / perpanjangan / downgrade plan user + simpan otomatis ke `manual_transactions`.
 */
router.post('/users/:id/subscription', async (req: Request, res: Response) => {
  const parsed = subscriptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input pengelolaan langganan tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const targetUserId = req.params.id;
  const adminId = req.user!.id;
  const { action, amount_idr, notes } = parsed.data;

  try {
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, plan, plan_expires_at')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    const now = Date.now();
    const existingExpiryMs = targetUser.plan_expires_at
      ? new Date(targetUser.plan_expires_at).getTime()
      : 0;
    const isCurrentlyActiveTimedPro =
      targetUser.plan === 'pro' && existingExpiryMs > now;
    const baseTimeMs = isCurrentlyActiveTimedPro ? existingExpiryMs : now;

    const actionConfig: Record<
      SubscriptionAction,
      {
        nextPlan: 'free' | 'pro';
        nextExpiresAt: string | null;
        planGranted: PlanGranted;
        durationDays: number | null;
      }
    > = {
      pro_30d: {
        nextPlan: 'pro',
        nextExpiresAt: new Date(baseTimeMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
        planGranted: 'pro_monthly',
        durationDays: 30,
      },
      pro_365d: {
        nextPlan: 'pro',
        nextExpiresAt: new Date(baseTimeMs + 365 * 24 * 60 * 60 * 1000).toISOString(),
        planGranted: 'pro_yearly',
        durationDays: 365,
      },
      pro_lifetime: {
        nextPlan: 'pro',
        nextExpiresAt: null,
        planGranted: 'pro_lifetime',
        durationDays: null,
      },
      downgrade_free: {
        nextPlan: 'free',
        nextExpiresAt: null,
        planGranted: 'downgrade_free',
        durationDays: null,
      },
    };

    const spec = actionConfig[action];

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: spec.nextPlan,
        plan_expires_at: spec.nextExpiresAt,
      })
      .eq('id', targetUserId)
      .select('id, email, full_name, role, plan, plan_expires_at, created_at')
      .single();

    if (updateError || !updatedProfile) {
      res.status(500).json({ error: updateError?.message || 'Gagal memperbarui plan user.' });
      return;
    }

    const { data: txData, error: txError } = await supabaseAdmin
      .from('manual_transactions')
      .insert({
        user_id: targetUserId,
        admin_id: adminId,
        plan_granted: spec.planGranted,
        duration_days: spec.durationDays,
        amount_idr: action === 'downgrade_free' ? 0 : amount_idr,
        payment_method: 'WhatsApp Manual',
        notes: notes || '',
      })
      .select('*')
      .single();

    if (txError) {
      console.error('[POST /api/admin/users/:id/subscription] Gagal log transaksi:', txError);
    }

    res.json({
      user: updatedProfile,
      transaction: txData || null,
    });
  } catch (error) {
    console.error('[POST /api/admin/users/:id/subscription] Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengelola langganan user.' });
  }
});

/**
 * GET /api/admin/transactions
 * Riwayat transaksi manual WhatsApp terbaru (join email & nama user) + ringkasan pemasukan.
 */
router.get('/transactions', async (_req: Request, res: Response) => {
  try {
    const { data: transactions, error } = await supabaseAdmin
      .from('manual_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const rows = transactions || [];
    const userIds = Array.from(
      new Set(
        rows
          .flatMap((t) => [t.user_id, t.admin_id])
          .filter((id): id is string => Boolean(id))
      )
    );

    const userMap = new Map<string, { email: string; full_name: string }>();
    if (userIds.length > 0) {
      const { data: usersData } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      for (const u of usersData || []) {
        userMap.set(u.id, { email: u.email || '', full_name: u.full_name || '' });
      }
    }

    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
    ).toISOString();

    let totalRevenueIdr = 0;
    let monthRevenueIdr = 0;

    const enriched = rows.map((t) => {
      const amount = Number(t.amount_idr) || 0;
      totalRevenueIdr += amount;
      if (t.created_at >= startOfMonth) {
        monthRevenueIdr += amount;
      }

      const userInfo = userMap.get(t.user_id);
      const adminInfo = t.admin_id ? userMap.get(t.admin_id) : undefined;

      return {
        ...t,
        user_email: userInfo?.email || '-',
        user_name: userInfo?.full_name || '',
        admin_email: adminInfo?.email || '-',
      };
    });

    res.json({
      transactions: enriched,
      summary: {
        total_revenue_idr: totalRevenueIdr,
        month_revenue_idr: monthRevenueIdr,
        total_count: enriched.length,
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/transactions] Error:', error);
    res.status(500).json({ error: 'Gagal memuat riwayat transaksi.' });
  }
});

/**
 * GET /api/admin/settings
 * Mengembalikan pengaturan sistem tanpa pernah mengirim `encrypted_gemini_api_key` mentah.
 */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    res.json({ settings: toSafeSettings(settings) });
  } catch (error) {
    console.error('[GET /api/admin/settings] Error:', error);
    res.status(500).json({ error: 'Gagal memuat pengaturan sistem.' });
  }
});

const updateSettingsSchema = z.object({
  ai_enabled: z.boolean().optional(),
  ai_model: z.string().trim().min(2).max(100).optional(),
  new_gemini_api_key: z.string().trim().max(300).optional(),
  clear_custom_api_key: z.boolean().optional(),
  free_autofill_daily_limit: z.number().int().min(0).max(1000).optional(),
  free_story_weekly_limit: z.number().int().min(0).max(100).optional(),
  pro_autofill_daily_fup: z.number().int().min(0).max(10000).optional(),
  pro_story_daily_fup: z.number().int().min(0).max(1000).optional(),
  whatsapp_admin_number: z
    .string()
    .trim()
    .regex(/^[0-9]{8,16}$/, 'Nomor WhatsApp harus berupa angka saja, contoh: 6281234567890')
    .optional(),
  pro_price_idr: z.number().int().min(0).max(50_000_000).optional(),
});

/**
 * PUT /api/admin/settings
 * Memperbarui pengaturan sistem, AI Kill Switch, model Gemini, kuota, harga, WA,
 * dan enkripsi AES-256-GCM untuk custom Gemini API key.
 */
router.put('/settings', async (req: Request, res: Response) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input pengaturan tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const {
      new_gemini_api_key,
      clear_custom_api_key,
      ...rest
    } = parsed.data;

    const updatePayload: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };

    if (clear_custom_api_key) {
      updatePayload.encrypted_gemini_api_key = null;
    } else if (new_gemini_api_key && new_gemini_api_key.length > 0) {
      // Enkripsi AES-256-GCM — jangan pernah console.log API key mentah!
      updatePayload.encrypted_gemini_api_key = encrypt(new_gemini_api_key);
    }

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .upsert(
        {
          id: 1,
          ...updatePayload,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (error || !data) {
      res.status(500).json({ error: error?.message || 'Gagal menyimpan pengaturan sistem.' });
      return;
    }

    res.json({ settings: toSafeSettings(data as AppSettingsRow) });
  } catch (error) {
    console.error(
      '[PUT /api/admin/settings] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : 'Gagal menyimpan pengaturan sistem.',
    });
  }
});

export default router;
