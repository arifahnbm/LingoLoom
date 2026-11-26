import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase';
import { calculateSM2, previewSM2Intervals } from '../services/sm2';
import { getTodayIsoDate } from '../services/quota';
import { Card } from '../types/models';

const router = Router();

const reviewSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

function attachPreviews(cards: Card[]) {
  return cards.map((card) => ({
    ...card,
    interval_previews: previewSM2Intervals({
      interval_days: card.interval_days,
      ease_factor: card.ease_factor,
      repetitions: card.repetitions,
      lapses: card.lapses,
    }),
  }));
}

async function updateDailyStreak(userId: string): Promise<number> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('streak_count, last_study_date')
    .eq('id', userId)
    .single();

  if (!profile) return 0;

  const today = getTodayIsoDate();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (profile.last_study_date === today) {
    return profile.streak_count;
  }

  const nextStreak =
    profile.last_study_date === yesterday ? (profile.streak_count || 0) + 1 : 1;

  await supabaseAdmin
    .from('profiles')
    .update({
      streak_count: nextStreak,
      last_study_date: today,
    })
    .eq('id', userId);

  return nextStreak;
}

/**
 * GET /api/study/daily
 * Mengambil seluruh kartu yang jatuh tempo review hari ini lintas deck.
 */
router.get('/daily', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const nowIso = new Date().toISOString();

  try {
    const { data: dueCards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', nowIso)
      .order('next_review_date', { ascending: true })
      .limit(30);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const cards = (dueCards || []) as Card[];
    res.json({
      title: 'Review Harian',
      mode: 'daily',
      cards: attachPreviews(cards),
    });
  } catch (error) {
    console.error('[GET /api/study/daily] Error:', error);
    res.status(500).json({ error: 'Gagal memuat antrean review harian.' });
  }
});

/**
 * GET /api/study/:deckId
 * Mengambil kartu yang jatuh tempo di deck tertentu (atau semua kartu jika `?mode=all`).
 */
router.get('/:deckId', async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { deckId } = req.params;
  const practiceAll = req.query.mode === 'all';
  const nowIso = new Date().toISOString();

  try {
    const { data: deck, error: deckError } = await supabaseAdmin
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .eq('user_id', userId)
      .single();

    if (deckError || !deck) {
      res.status(404).json({ error: 'Deck tidak ditemukan.' });
      return;
    }

    let query = supabaseAdmin
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .eq('user_id', userId);

    if (!practiceAll) {
      query = query.lte('next_review_date', nowIso);
    }

    const { data: cardsData, error: cardsError } = await query
      .order('next_review_date', { ascending: true })
      .limit(50);

    if (cardsError) {
      res.status(500).json({ error: cardsError.message });
      return;
    }

    let cards = (cardsData || []) as Card[];
    let usedFallbackAll = false;

    // Jika tidak ada kartu due dan belum memilih mode=all, beri info agar user bisa latihan bebas
    if (cards.length === 0 && !practiceAll) {
      const { count } = await supabaseAdmin
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('deck_id', deckId)
        .eq('user_id', userId);

      res.json({
        title: deck.title,
        deck,
        mode: 'due',
        total_in_deck: count ?? 0,
        used_fallback_all: usedFallbackAll,
        cards: [],
      });
      return;
    }

    usedFallbackAll = practiceAll;
    res.json({
      title: deck.title,
      deck,
      mode: practiceAll ? 'all' : 'due',
      total_in_deck: cards.length,
      used_fallback_all: usedFallbackAll,
      cards: attachPreviews(cards),
    });
  } catch (error) {
    console.error('[GET /api/study/:deckId] Error:', error);
    res.status(500).json({ error: 'Gagal memuat sesi belajar deck.' });
  }
});

/**
 * POST /api/study/:cardId/review
 * Menghitung ulang SM-2 berdasarkan rating ('again' | 'hard' | 'good' | 'easy'),
 * menyimpan review_log, dan memperbarui streak harian pengguna.
 */
router.post('/:cardId/review', async (req: Request, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Rating evaluasi harus berupa again, hard, good, atau easy.' });
    return;
  }

  const userId = req.user!.id;
  const { cardId } = req.params;
  const { rating } = parsed.data;

  try {
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      res.status(404).json({ error: 'Kartu tidak ditemukan.' });
      return;
    }

    const sm2 = calculateSM2(
      {
        interval_days: card.interval_days,
        ease_factor: card.ease_factor,
        repetitions: card.repetitions,
        lapses: card.lapses,
      },
      rating
    );

    const [updateRes, logRes, streakCount] = await Promise.all([
      supabaseAdmin
        .from('cards')
        .update({
          interval_days: sm2.interval_days,
          ease_factor: sm2.ease_factor,
          repetitions: sm2.repetitions,
          lapses: sm2.lapses,
          next_review_date: sm2.next_review_date,
        })
        .eq('id', cardId)
        .eq('user_id', userId)
        .select('*')
        .single(),
      supabaseAdmin.from('review_logs').insert({
        user_id: userId,
        card_id: cardId,
        rating,
      }),
      updateDailyStreak(userId),
    ]);

    if (updateRes.error) {
      res.status(500).json({ error: updateRes.error.message });
      return;
    }

    if (logRes.error) {
      console.error('[POST /api/study/:cardId/review] Log error:', logRes.error);
    }

    res.json({
      card: updateRes.data,
      sm2,
      streak_count: streakCount,
    });
  } catch (error) {
    console.error('[POST /api/study/:cardId/review] Error:', error);
    res.status(500).json({ error: 'Gagal menyimpan hasil evaluasi kartu.' });
  }
});

export default router;
