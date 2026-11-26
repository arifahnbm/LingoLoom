import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { getOrResetProfile, getQuotaSummary } from '../services/quota';
import { getEffectivePlan } from '../utils/planGuard';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const [profile, quota, cardsRes] = await Promise.all([
      getOrResetProfile(userId),
      getQuotaSummary(userId),
      supabaseAdmin
        .from('cards')
        .select('id, repetitions, interval_days, next_review_date')
        .eq('user_id', userId),
    ]);

    const effectivePlan = getEffectivePlan(profile);
    const cards = cardsRes.data || [];
    const now = new Date();

    const totalWords = cards.length;
    const dueToday = cards.filter((c) => new Date(c.next_review_date) <= now).length;
    const masteredWords = cards.filter(
      (c) => (c.repetitions || 0) >= 2 && (c.interval_days || 0) >= 6
    ).length;

    res.json({
      profile: {
        ...profile,
        role: profile.role || 'user',
        plan: effectivePlan,
        plan_expires_at: effectivePlan === 'pro' ? profile.plan_expires_at || null : null,
      },
      stats: {
        streak_count: profile.streak_count,
        last_study_date: profile.last_study_date,
        total_words: totalWords,
        due_today: dueToday,
        mastered_words: masteredWords,
      },
      quota,
    });
  } catch (error) {
    console.error('[GET /api/profile] Error:', error);
    res.status(500).json({ error: 'Gagal memuat profil pengguna.' });
  }
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
});

router.patch('/', async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data profil tidak valid.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(parsed.data)
      .eq('id', req.user!.id)
      .select('*')
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ profile: data });
  } catch (error) {
    console.error('[PATCH /api/profile] Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

export default router;
