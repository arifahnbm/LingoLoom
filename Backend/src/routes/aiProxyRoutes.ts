import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { requestAIAutoFill } from '../services/aiClient';
import {
  checkAutoFillQuota,
  getQuotaSummary,
  incrementAutoFillUsage,
} from '../services/quota';

const router = Router();

const autoFillSchema = z.object({
  word: z.string().trim().min(1, 'Masukkan kata bahasa Inggris terlebih dahulu').max(80),
  context: z.enum(['daily', 'work', 'academic']).optional().default('daily'),
});

/**
 * POST /api/ai/auto-fill
 * 1. Cek Freemium Quota Guard (5x/hari untuk Free, unlimited untuk Pro).
 * 2. Cek Global Vocab Cache di tabel `vocab_cache` sebelum memanggil AI Service.
 * 3. Jika cache miss -> panggil service `AI/` -> simpan ke `vocab_cache`.
 * 4. Increment kuota harian jika user menggunakan paket Free.
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
    // 1. Cek kuota freemium
    const quotaCheck = await checkAutoFillQuota(userId);
    if (!quotaCheck.allowed) {
      res.status(429).json({
        error: quotaCheck.message,
        code: 'QUOTA_EXCEEDED',
        quota: quotaCheck.quota,
      });
      return;
    }

    // 2. Cek Global Vocab Cache (hanya untuk konteks daily atau exact word match)
    const { data: cachedEntry } = await supabaseAdmin
      .from('vocab_cache')
      .select('*')
      .eq('word', normalizedKey)
      .maybeSingle();

    if (cachedEntry && context === 'daily') {
      if (!quotaCheck.quota.is_pro) {
        await incrementAutoFillUsage(userId);
      }
      const updatedQuota = await getQuotaSummary(userId);

      res.json({
        word:
          cachedEntry.word.charAt(0).toUpperCase() + cachedEntry.word.slice(1),
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

    // 3. Cache miss -> panggil AI Microservice
    const aiResult = await requestAIAutoFill(word, context);

    // 4. Simpan ke global vocab_cache agar pengguna lain bisa langsung hemat kuota AI
    if (context === 'daily' && aiResult.meaning_id) {
      await supabaseAdmin.from('vocab_cache').upsert(
        {
          word: normalizedKey,
          phonetic: aiResult.phonetic,
          part_of_speech: aiResult.part_of_speech,
          meaning_id: aiResult.meaning_id,
          synonyms: aiResult.synonyms,
          examples: aiResult.examples,
        },
        { onConflict: 'word' }
      );
    }

    if (!quotaCheck.quota.is_pro) {
      await incrementAutoFillUsage(userId);
    }
    const updatedQuota = await getQuotaSummary(userId);

    res.json({
      ...aiResult,
      cached: false,
      quota: updatedQuota,
    });
  } catch (error) {
    console.error('[POST /api/ai/auto-fill] Error:', error);
    res.status(502).json({
      error:
        'Tidak dapat terhubung ke LingoLoom AI Service. Pastikan service AI berjalan di port 5000.',
    });
  }
});

export default router;
