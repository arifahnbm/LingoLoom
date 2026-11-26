import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  DynamicGeminiConfig,
  generateAutoFill,
  generateMicroStory,
} from '../services/geminiService';

const router = Router();

const autoFillSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, 'Kata tidak boleh kosong')
    .max(80, 'Kata terlalu panjang (maksimal 80 karakter)'),
  context: z.enum(['daily', 'work', 'academic']).optional().default('daily'),
  model: z.string().trim().min(1).max(100).optional(),
  apiKey: z.string().trim().min(1).max(300).optional(),
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
  model: z.string().trim().min(1).max(100).optional(),
  apiKey: z.string().trim().min(1).max(300).optional(),
});

function isValidInternalSecret(req: Request): boolean {
  const expected = process.env.INTERNAL_AI_SECRET?.trim();
  const received = req.header('x-internal-secret')?.trim();
  if (!expected || !received) {
    return false;
  }

  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(received, 'utf8');
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

function extractTrustedRuntimeConfig(
  req: Request,
  body: { model?: string; apiKey?: string }
): DynamicGeminiConfig | undefined {
  if (!isValidInternalSecret(req)) {
    return undefined;
  }

  const config: DynamicGeminiConfig = {};
  if (body.model) config.model = body.model;
  if (body.apiKey) config.apiKey = body.apiKey;
  return config;
}

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
    const runtimeConfig = extractTrustedRuntimeConfig(req, parsed.data);
    const result = await generateAutoFill(
      parsed.data.word,
      parsed.data.context,
      runtimeConfig
    );
    res.json(result);
  } catch (error) {
    console.error('[POST /api/ai/auto-fill] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
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
    const runtimeConfig = extractTrustedRuntimeConfig(req, parsed.data);
    const result = await generateMicroStory(
      parsed.data.words,
      parsed.data.level,
      runtimeConfig
    );
    res.json(result);
  } catch (error) {
    console.error('[POST /api/ai/micro-story] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Gagal menyusun micro-story' });
  }
});

export default router;
