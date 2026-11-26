import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { Deck, DeckWithStats } from '../types/models';

const router = Router();

const deckSchema = z.object({
  title: z.string().trim().min(1, 'Judul deck wajib diisi').max(80),
  description: z.string().trim().max(240).optional().default(''),
  color_theme: z
    .enum(['emerald', 'sky', 'amber', 'violet', 'coral'])
    .optional()
    .default('emerald'),
  icon: z
    .enum(['book-open', 'sparkles', 'briefcase', 'graduation-cap', 'plane', 'flame', 'heart'])
    .optional()
    .default('book-open'),
  is_public: z.boolean().optional().default(false),
});

router.get('/', async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const [decksRes, cardsRes] = await Promise.all([
      supabaseAdmin
        .from('decks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('cards')
        .select('id, deck_id, repetitions, interval_days, next_review_date')
        .eq('user_id', userId),
    ]);

    if (decksRes.error) {
      res.status(500).json({ error: decksRes.error.message });
      return;
    }

    const decks = (decksRes.data || []) as Deck[];
    const cards = cardsRes.data || [];
    const now = new Date();

    const decksWithStats: DeckWithStats[] = decks.map((deck) => {
      const deckCards = cards.filter((c) => c.deck_id === deck.id);
      const totalCards = deckCards.length;
      const dueCards = deckCards.filter((c) => new Date(c.next_review_date) <= now).length;
      const masteredCards = deckCards.filter(
        (c) => (c.repetitions || 0) >= 2 && (c.interval_days || 0) >= 6
      ).length;
      const progressPercent =
        totalCards === 0 ? 0 : Math.round((masteredCards / totalCards) * 100);

      return {
        ...deck,
        total_cards: totalCards,
        due_cards: dueCards,
        mastered_cards: masteredCards,
        progress_percent: progressPercent,
      };
    });

    res.json({ decks: decksWithStats });
  } catch (error) {
    console.error('[GET /api/decks] Error:', error);
    res.status(500).json({ error: 'Gagal memuat daftar deck.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = deckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Input deck tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .insert({
        ...parsed.data,
        user_id: req.user!.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      res.status(400).json({ error: error?.message || 'Gagal membuat deck.' });
      return;
    }

    const deckWithStats: DeckWithStats = {
      ...(data as Deck),
      total_cards: 0,
      due_cards: 0,
      mastered_cards: 0,
      progress_percent: 0,
    };

    res.status(201).json({ deck: deckWithStats });
  } catch (error) {
    console.error('[POST /api/decks] Error:', error);
    res.status(500).json({ error: 'Terjadi kesalahan saat membuat deck.' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = deckSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Data pembaruan deck tidak valid.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('decks')
      .update(parsed.data)
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select('*')
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Deck tidak ditemukan.' });
      return;
    }

    res.json({ deck: data });
  } catch (error) {
    console.error('[PATCH /api/decks/:id] Error:', error);
    res.status(500).json({ error: 'Gagal memperbarui deck.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('decks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/decks/:id] Error:', error);
    res.status(500).json({ error: 'Gagal menghapus deck.' });
  }
});

router.get('/:id/cards', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const deckId = req.params.id;

  try {
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .single();

    if (deckError || !deck) {
      res.status(404).json({ error: 'Deck tidak ditemukan.' });
      return;
    }

    const { data: cards, error: cardsError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: false });

    if (cardsError) {
      res.status(500).json({ error: cardsError.message });
      return;
    }

    res.json({ deck, cards: cards || [] });
  } catch (error) {
    console.error('[GET /api/decks/:id/cards] Error:', error);
    res.status(500).json({ error: 'Gagal memuat kartu dalam deck.' });
  }
});

export default router;
