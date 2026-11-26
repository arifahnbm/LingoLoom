import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { generateAutoFill, generateMicroStory } from '../services/geminiService';

const router = Router();

const autoFillSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, 'Kata tidak boleh kosong')
    .max(80, 'Kata terlalu panjang (maksimal 80 karakter)'),
  context: z.enum(['daily', 'work', 'academic']).optional().default('daily'),
});

const microStorySchema = z.object({
  words: z
    .array(
      z.object({
        word: z.string().trim().min(1),
        meaning_id: z.string().trim().min(1),
      })
    )
    .min(1, 'Minimal 1 kata diperlukan untuk membuat cerita')
    .max(10, 'Maksimal 10 kata per cerita'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
});

router.post('/auto-fill', async (req: Request, res: Response) => {
  const parsed = autoFillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await generateAutoFill(parsed.data.word, parsed.data.context);
    res.json(result);
  } catch (error) {
    console.error('[POST /api/ai/auto-fill] Unexpected error:', error);
    res.status(500).json({ error: 'Gagal menghasilkan detail kosa kata' });
  }
});

router.post('/micro-story', async (req: Request, res: Response) => {
  const parsed = microStorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await generateMicroStory(parsed.data.words, parsed.data.level);
    res.json(result);
  } catch (error) {
    console.error('[POST /api/ai/micro-story] Unexpected error:', error);
    res.status(500).json({ error: 'Gagal menyusun micro-story' });
  }
});

export default router;
