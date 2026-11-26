import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { requestAIAutoFill } from '../services/aiClient';
import {
  checkAutoFillQuota,
  getQuotaSummary,
  incrementAutoFillUsage,
} from '../services/quota';
import { logAiUsage, resolveAiRuntimeConfig } from '../utils/planGuard';

const router = Router();

const autoFillSchema = z.object({
  word: z.string().trim().min(1, 'Masukkan kata bahasa Inggris terlebih dahulu').max(80),
  context: z.enum(['daily', 'work', 'academic']).optional().default('daily'),
});

/**
 * POST /api/ai/auto-fill
 * 1. Cek AI Kill Switch, Lazy Expiry & Kuota Dinamis (Free / Pro FUP) dari `app_settings`.
 * 2. Cek Global Vocab Cache (`vocab_cache`) sebelum memanggil AI Service.
 * 3. Jika cache miss -> panggil service `AI/` dengan model & key dinamis -> simpan ke `vocab_cache`.
 * 4. Catat pemakaian ke `ai_usage_logs` & increment counter harian.
 */
router.post('/auto-fill', async (req: Request, res: Response) => {
  const parsed = autoFillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const userId = req.user!.id;
  const { word, context } = parsed.data;
  const normalizedKey = word.trim().toLowerCase();

  try {
    // 1. Cek AI Kill Switch & kuota dinamis
    const quotaCheck = await checkAutoFillQuota(userId);
    if (!quotaCheck.allowed) {
      res.status(quotaCheck.status || 429).json({
        error: quotaCheck.message,
        code: quotaCheck.code || 'QUOTA_EXCEEDED',
        quota: quotaCheck.quota,
      });
      return;
    }

    // 2. Cek Global Vocab Cache (untuk konteks daily)
    const { data: cachedEntry } = await supabaseAdmin
      .from('vocab_cache')
      .select('*')
      .eq('word', normalizedKey)
      .maybeSingle();

    if (cachedEntry && context === 'daily') {
      await Promise.all([
        incrementAutoFillUsage(userId),
        logAiUsage(userId, 'auto_fill', true),
      ]);
      const updatedQuota = await getQuotaSummary(userId, quotaCheck.settings);

      res.json({
        word: cachedEntry.word.charAt(0).toUpperCase() + cachedEntry.word.slice(1),
        phonetic: cachedEntry.phonetic,
        part_of_speech: cachedEntry.part_of_speech,
        meaning_id: cachedEntry.meaning_id,
        synonyms: cachedEntry.synonyms || [],
        examples: cachedEntry.examples || [],
        cached: true,
        source: 'cache',
        quota: updatedQuota,
      });
      return;
    }

    // 3. Cache miss -> panggil AI Microservice dengan model & key dinamis dari app_settings
    const runtimeConfig = resolveAiRuntimeConfig(quotaCheck.settings);
    const aiResult = await requestAIAutoFill(word, context, runtimeConfig);

    // 4. Simpan ke global vocab_cache + catat penggunaan
    const tasks: Array<Promise<unknown>> = [
      incrementAutoFillUsage(userId),
      logAiUsage(userId, 'auto_fill', false),
    ];

    if (context === 'daily' && aiResult.meaning_id) {
      tasks.push(
        Promise.resolve(
          supabaseAdmin.from('vocab_cache').upsert(
            {
              word: normalizedKey,
              phonetic: aiResult.phonetic,
              part_of_speech: aiResult.part_of_speech,
              meaning_id: aiResult.meaning_id,
              synonyms: aiResult.synonyms,
              examples: aiResult.examples,
            },
            { onConflict: 'word' }
          )
        )
      );
    }

    await Promise.all(tasks);
    const updatedQuota = await getQuotaSummary(userId, quotaCheck.settings);

    res.json({
      ...aiResult,
      cached: false,
      quota: updatedQuota,
    });
  } catch (error) {
    console.error(
      '[POST /api/ai/auto-fill] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.status(502).json({
      error:
        'Tidak dapat terhubung ke LingoLoop AI Service. Pastikan service AI berjalan di port 5000.',
    });
  }
});

export default router;
