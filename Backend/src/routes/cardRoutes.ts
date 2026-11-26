import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

const exampleSchema = z.object({
  en: z.string().trim().min(1),
  id: z.string().trim().min(1),
});

const createCardSchema = z.object({
  deck_id: z.string().uuid('ID Deck tidak valid'),
  word: z.string().trim().min(1, 'Kata bahasa Inggris wajib diisi').max(100),
  phonetic: z.string().trim().max(100).optional().default(''),
  part_of_speech: z.string().trim().max(50).optional().default(''),
  meaning_id: z.string().trim().min(1, 'Arti bahasa Indonesia wajib diisi').max(300),
  synonyms: z.array(z.string().trim().min(1)).max(8).optional().default([]),
  examples: z.array(exampleSchema).max(4).optional().default([]),
  audio_url: z.string().url().nullable().optional().default(null),
  source_sentence: z.string().trim().max(500).nullable().optional(),
  source_url: z.string().url().max(1000).nullable().optional(),
  source_type: z.enum(['web', 'extension']).optional(),
});

const updateCardSchema = createCardSchema.omit({ deck_id: true }).partial();

/**
 * CRUD Flashcards — Unlimited basic text cards untuk pengguna Free maupun Pro.
 */
router.post('/', async (req: Request, res: Response) => {
  const parsed = createCardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input flashcard tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const userId = req.user!.id;

  try {
    // Pastikan deck dimiliki oleh user
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('decks')
      .select('id')
      .eq('id', parsed.data.deck_id)
      .eq('user_id', userId)
      .single();

    if (deckError || !deck) {
      res.status(404).json({ error: 'Deck tujuan tidak ditemukan.' });
      return;
    }

    const { data: card, error } = await supabaseAdmin
      .from('cards')
      .insert({
        ...parsed.data,
        user_id: userId,
        next_review_date: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !card) {
      res.status(400).json({ error: error?.message || 'Gagal menyimpan flashcard.' });
      return;
    }

    res.status(201).json({ card });
  } catch (error) {
    console.error('[POST /api/cards] Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menyimpan kartu.' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateCardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data pembaruan kartu tidak valid.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('cards')
      .update(parsed.data)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select('*')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Kartu tidak ditemukan.' });
      return;
    }

    res.json({ card: data });
  } catch (error) {
    console.error('[PATCH /api/cards/:id] Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui kartu.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('cards')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/cards/:id] Error:', error);
    res.status(500).json({ error: 'Gagal menghapus kartu.' });
  }
});

export default router;
