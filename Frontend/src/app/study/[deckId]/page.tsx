'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { Flashcard3D } from '@/components/study/Flashcard3D';
import { TactileButton } from '@/components/ui/TactileButton';
import { createClient } from '@/lib/supabase/client';
import { ApiError, lingoloopApi } from '@/lib/api';
import { speakEnglish, stopSpeaking } from '@/lib/speech';
import { Flashcard, ReviewRating, SpeechAccent } from '@/types/lingoloop';

interface RatingButtonConfig {
  rating: ReviewRating;
  keyNum: string;
  label: string;
  variant: 'danger' | 'orange' | 'secondary' | 'primary';
  fallbackInterval: string;
}

const RATING_BUTTONS: RatingButtonConfig[] = [
  { rating: 'again', keyNum: '1', label: 'Lupa', variant: 'danger', fallbackInterval: '10 mnt' },
  { rating: 'hard', keyNum: '2', label: 'Susah', variant: 'orange', fallbackInterval: '1 hari' },
  { rating: 'good', keyNum: '3', label: 'Ingat', variant: 'secondary', fallbackInterval: '1 hari' },
  { rating: 'easy', keyNum: '4', label: 'Mudah', variant: 'primary', fallbackInterval: '4 hari' },
];

export default function StudyZenPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = String(params?.deckId || 'daily');
  const isDaily = deckId === 'daily';

  const [sessionTitle, setSessionTitle] = useState(isDaily ? 'Review Harian' : 'Sesi Belajar');
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [totalInDeck, setTotalInDeck] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [reviewedCount, setReviewedCount] = useState(0);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [latestStreak, setLatestStreak] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const loadQueue = useCallback(
    async (practiceAll = false) => {
      setLoading(true);
      setError('');
      setIsCompleted(false);
      setCurrentIndex(0);
      setIsFlipped(false);
      setReviewedCount(0);
      setRememberedCount(0);

      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace('/login');
          return;
        }

        if (isDaily) {
          const res = await lingoloopApi.getDailyStudyQueue();
          setSessionTitle(res.title || 'Review Harian');
          setQueue(res.cards);
          setTotalInDeck(res.cards.length);
        } else {
          const res = await lingoloopApi.getDeckStudyQueue(deckId, practiceAll);
          setSessionTitle(res.title || 'Sesi Belajar');
          setQueue(res.cards);
          setTotalInDeck(res.total_in_deck ?? res.cards.length);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Gagal memuat antrean belajar.');
      } finally {
        setLoading(false);
      }
    },
    [deckId, isDaily, router]
  );

  useEffect(() => {
    loadQueue(false);
    return () => {
      stopSpeaking();
    };
  }, [loadQueue]);

  const currentCard = queue[currentIndex] || null;
  const totalCards = queue.length;
  const progressPercent =
    totalCards === 0
      ? 0
      : isCompleted
      ? 100
      : Math.round((currentIndex / totalCards) * 100);

  const triggerCelebration = useCallback(() => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#58CC02', '#1CB0F6', '#FFC800', '#8B5CF6'],
    });
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 55,
        origin: { x: 0.15, y: 0.65 },
        colors: ['#58CC02', '#FFC800'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 55,
        origin: { x: 0.85, y: 0.65 },
        colors: ['#1CB0F6', '#8B5CF6'],
      });
    }, 240);
  }, []);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentCard || submitting) return;

      setSubmitting(true);
      stopSpeaking();
      try {
        const res = await lingoloopApi.submitReview(currentCard.id, rating);
        setLatestStreak(res.streak_count);
        setReviewedCount((prev) => prev + 1);
        if (rating === 'good' || rating === 'easy') {
          setRememberedCount((prev) => prev + 1);
        }

        if (currentIndex + 1 >= queue.length) {
          setIsCompleted(true);
          triggerCelebration();
        } else {
          setIsFlipped(false);
          setCurrentIndex((prev) => prev + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan evaluasi kartu.');
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, queue.length, submitting, triggerCelebration]
  );

  // Keyboard shortcuts: Spasi = flip, 1-4 = evaluasi SRS, A = putar audio
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || loading || !currentCard) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        speakEnglish(currentCard.word, { accent, audioUrl: currentCard.audio_url });
      } else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, ReviewRating> = {
          '1': 'again',
          '2': 'hard',
          '3': 'good',
          '4': 'easy',
        };
        handleRate(map[e.key]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [accent, currentCard, handleRate, isCompleted, isFlipped, loading]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFDF9]">
      {/* Zen Mode Top Progress Header */}
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-5 sm:gap-4 sm:px-6">
        <Link
          href="/dashboard"
          aria-label="Keluar dari sesi belajar"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </Link>

        {/* Animated Emerald Progress Bar */}
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs font-extrabold text-slate-500">
            <span className="truncate">{sessionTitle}</span>
            <span>
              {totalCards > 0
                ? `${Math.min(currentIndex + (isCompleted ? 1 : 0), totalCards)} / ${totalCards}`
                : '0 / 0'}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100">
            <div
              className="h-full rounded-full bg-[#58CC02] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progressPercent, totalCards > 0 ? 5 : 0)}%` }}
            />
          </div>
        </div>

        {/* Accent Toggle */}
        <div className="inline-flex shrink-0 rounded-xl border-2 border-slate-200 bg-white p-0.5 text-xs font-black">
          {(['en-US', 'en-GB'] as SpeechAccent[]).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setAccent(acc)}
              className={`rounded-lg px-2.5 py-1.5 transition-colors ${
                accent === acc
                  ? 'bg-[#1CB0F6] text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {acc === 'en-US' ? 'US' : 'UK'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-8 sm:px-6">
        {error && (
          <div className="mb-5 rounded-2xl border-2 border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mx-auto w-full max-w-xl">
            <div className="tactile-card h-[420px] animate-pulse bg-slate-100/70" />
          </div>
        ) : isCompleted ? (
          /* Layar Selesai Sesi + Confetti + Ajakan Micro-Story */
          <div className="tactile-card mx-auto w-full max-w-xl p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-b-4 border-[#D97706] bg-[#FFC800] text-slate-900 shadow-sm">
              <Trophy className="h-10 w-10" strokeWidth={2.5} />
            </div>

            <h1 className="mt-5 text-3xl font-black text-slate-900">
              Sesi Selesai! Keren Banget! 🎉
            </h1>
            <p className="mt-2 text-base font-bold text-slate-500">
              Otakmu baru saja memperkuat koneksi memori jangka panjang.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-700">{reviewedCount}</p>
                <p className="text-xs font-extrabold text-emerald-600">Kartu Di-review</p>
              </div>
              <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
                <p className="text-2xl font-black text-[#0284C7]">
                  {reviewedCount > 0 ? Math.round((rememberedCount / reviewedCount) * 100) : 100}%
                </p>
                <p className="text-xs font-extrabold text-[#0284C7]">Daya Ingat</p>
              </div>
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="inline-flex items-center gap-1 text-2xl font-black text-amber-600">
                  <Flame className="h-5 w-5 fill-[#FFC800]" />
                  {latestStreak ?? 1}
                </p>
                <p className="text-xs font-extrabold text-amber-700">Daily Streak</p>
              </div>
            </div>

            {/* Ajakan membuat Micro-Story */}
            <div className="mt-6 rounded-2xl border-2 border-violet-200 bg-violet-50/70 p-5 text-left">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6] text-white">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-black text-violet-950">
                    Bikin kata tadi makin nempel lewat Micro-Story!
                  </h2>
                  <p className="mt-0.5 text-xs font-bold text-violet-800/80">
                    AI akan merangkai kata yang baru kamu pelajari & kata sulitmu menjadi cerita
                    bahasa Inggris pendek lengkap dengan audio.
                  </p>
                </div>
              </div>
              <Link href="/stories" className="mt-4 block">
                <TactileButton variant="violet" fullWidth>
                  <BookMarked className="h-4 w-4" />
                  Buat Micro-Story Sekarang
                </TactileButton>
              </Link>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/dashboard" className="flex-1">
                <TactileButton variant="primary" fullWidth>
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Dashboard
                </TactileButton>
              </Link>
            </div>
          </div>
        ) : !currentCard ? (
          /* Tidak ada kartu yang jatuh tempo */
          <div className="tactile-card mx-auto w-full max-w-xl p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-[#46A302]">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="mt-4 text-2xl font-black text-slate-900">
              Tidak Ada Kartu Jatuh Tempo Saat Ini!
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {isDaily
                ? 'Kamu sudah menuntaskan semua jadwal review hari ini. Tambah kata baru di Dashboard atau latih pemahaman lewat Micro-Story.'
                : totalInDeck > 0
                ? 'Semua kartu di deck ini sudah terjadwal untuk hari berikutnya. Mau latihan bebas semua kartu di deck ini?'
                : 'Deck ini masih kosong. Tambahkan kata terlebih dahulu lewat Quick Add di Dashboard.'}
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {!isDaily && totalInDeck > 0 && (
                <TactileButton
                  type="button"
                  variant="secondary"
                  onClick={() => loadQueue(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Latihan Semua Kartu ({totalInDeck})
                </TactileButton>
              )}
              <Link href="/dashboard">
                <TactileButton variant="primary">Kembali ke Dashboard</TactileButton>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Flashcard Session */
          <div className="flex flex-col items-center">
            <Flashcard3D
              card={currentCard}
              isFlipped={isFlipped}
              accent={accent}
              onFlip={() => setIsFlipped((prev) => !prev)}
            />

            {/* Bottom Controls — Mobile thumb-friendly + Desktop keyboard shortcuts */}
            <div className="mt-7 w-full max-w-xl">
              {!isFlipped ? (
                <TactileButton
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => setIsFlipped(true)}
                >
                  Lihat Jawaban
                </TactileButton>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {RATING_BUTTONS.map((btn) => {
                      const estimate =
                        currentCard.interval_previews?.[btn.rating] || btn.fallbackInterval;
                      return (
                        <TactileButton
                          key={btn.rating}
                          type="button"
                          variant={btn.variant}
                          disabled={submitting}
                          onClick={() => handleRate(btn.rating)}
                          className="flex-col !gap-0.5 !py-3"
                        >
                          <span className="text-base font-black">{btn.label}</span>
                          <span className="text-[11px] font-bold opacity-90">
                            {estimate} • [{btn.keyNum}]
                          </span>
                        </TactileButton>
                      );
                    })}
                  </div>
                  <p className="hidden text-center text-xs font-bold text-slate-400 sm:block">
                    Shortcut Keyboard: <kbd className="rounded bg-slate-200/70 px-1.5 py-0.5 text-slate-600">Spasi</kbd> balik kartu •{' '}
                    <kbd className="rounded bg-slate-200/70 px-1.5 py-0.5 text-slate-600">1</kbd>–
                    <kbd className="rounded bg-slate-200/70 px-1.5 py-0.5 text-slate-600">4</kbd> evaluasi •{' '}
                    <kbd className="rounded bg-slate-200/70 px-1.5 py-0.5 text-slate-600">A</kbd> audio
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
