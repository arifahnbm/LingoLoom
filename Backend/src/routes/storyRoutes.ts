import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { requestAIMicroStory } from '../services/aiClient';
import { checkMicroStoryQuota, getQuotaSummary } from '../services/quota';
import { logAiUsage, resolveAiRuntimeConfig } from '../utils/planGuard';

const router = Router();

const generateStorySchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  deck_id: z.string().uuid().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const [storiesRes, quota] = await Promise.all([
      supabaseAdmin
        .from('micro_stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(25),
      getQuotaSummary(userId),
    ]);

    if (storiesRes.error) {
      res.status(500).json({ error: storiesRes.error.message });
      return;
    }

    res.json({
      stories: storiesRes.data || [],
      quota,
    });
  } catch (error) {
    console.error('[GET /api/stories] Error:', error);
    res.status(500).json({ error: 'Gagal memuat riwayat cerita mikro.' });
  }
});

/**
 * POST /api/stories/generate
 * Micro-Stories Orchestrator:
 * 1. Cek AI Kill Switch, Lazy Expiry & Kuota Dinamis (Free mingguan / Pro FUP harian).
 * 2. Ambil 5–7 kata dengan lapses tertinggi atau kartu terbaru milik user.
 * 3. Kirim ke service AI/ dengan model & key dinamis -> simpan ke `micro_stories` -> catat `ai_usage_logs`.
 */
router.post('/generate', async (req: Request, res: Response) => {
  const parsed = generateStorySchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Parameter pembuatan cerita tidak valid.' });
    return;
  }

  const userId = req.user!.id;
  const { level, deck_id } = parsed.data;

  try {
    // 1. Cek AI Kill Switch & kuota
    const quotaCheck = await checkMicroStoryQuota(userId);
    if (!quotaCheck.allowed) {
      res.status(quotaCheck.status || 429).json({
        error: quotaCheck.message,
        code: quotaCheck.code || 'QUOTA_EXCEEDED',
        quota: quotaCheck.quota,
      });
      return;
    }

    // 2. Ambil 5-7 kata dengan tingkat lupa (lapses) tertinggi atau kartu terbaru
    let cardQuery = supabaseAdmin
      .from('cards')
      .select('word, meaning_id, lapses, created_at')
      .eq('user_id', userId);

    if (deck_id) {
      cardQuery = cardQuery.eq('deck_id', deck_id);
    }

    const { data: userCards, error: cardsError } = await cardQuery
      .order('lapses', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(7);

    if (cardsError) {
      res.status(500).json({ error: cardsError.message });
      return;
    }

    const uniqueWordsMap = new Map<string, { word: string; meaning_id: string }>();
    for (const c of userCards || []) {
      const key = c.word.trim().toLowerCase();
      if (!uniqueWordsMap.has(key)) {
        uniqueWordsMap.set(key, {
          word: c.word.trim(),
          meaning_id: c.meaning_id.trim(),
        });
      }
    }

    const selectedWords = Array.from(uniqueWordsMap.values()).slice(0, 7);

    if (selectedWords.length < 3) {
      res.status(400).json({
        error:
          'Tambahkan minimal 3 kartu kosa kata terlebih dahulu di Dashboard agar AI dapat merangkai Micro-Story yang seru untukmu!',
        code: 'INSUFFICIENT_CARDS',
      });
      return;
    }

    // 3. Panggil AI Microservice dengan model & key dinamis dari app_settings
    const runtimeConfig = resolveAiRuntimeConfig(quotaCheck.settings);
    const generated = await requestAIMicroStory(selectedWords, level, runtimeConfig);

    // 4. Simpan ke database Supabase & catat log penggunaan AI
    const [saveRes] = await Promise.all([
      supabaseAdmin
        .from('micro_stories')
        .insert({
          user_id: userId,
          title: generated.title,
          story_en: generated.story_en,
          story_id: generated.story_id,
          target_words: generated.highlighted_words,
        })
        .select('*')
        .single(),
      logAiUsage(userId, 'micro_story', false),
    ]);

    if (saveRes.error || !saveRes.data) {
      res.status(500).json({ error: saveRes.error?.message || 'Gagal menyimpan Micro-Story.' });
      return;
    }

    const updatedQuota = await getQuotaSummary(userId, quotaCheck.settings);

    res.status(201).json({
      story: saveRes.data,
      source: generated.source || 'gemini',
      quota: updatedQuota,
    });
  } catch (error) {
    console.error(
      '[POST /api/stories/generate] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(502).json({
      error:
        'Gagal menghubungi LingoLoop AI Service untuk menyusun cerita. Pastikan service AI berjalan di port 5000.',
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('micro_stories')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/stories/:id] Error:', error);
    res.status(500).json({ error: 'Gagal menghapus cerita.' });
  }
});

export default router;
