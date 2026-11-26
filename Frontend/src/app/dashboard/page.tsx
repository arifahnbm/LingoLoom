'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  BookMarked,
  BookOpen,
  Briefcase,
  Flame,
  GraduationCap,
  Heart,
  Layers,
  Play,
  Plane,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { TactileButton } from '@/components/ui/TactileButton';
import { QuickAddVocab } from '@/components/dashboard/QuickAddVocab';
import { CreateDeckModal } from '@/components/dashboard/CreateDeckModal';
import { DeckCardsModal } from '@/components/dashboard/DeckCardsModal';
import { createClient } from '@/lib/supabase/client';
import { ApiError, lingoloopApi } from '@/lib/api';
import { Deck, ProfileOverviewResponse, QuotaSummary } from '@/types/lingoloop';

const THEME_STYLES: Record<
  string,
  { badge: string; bar: string; iconBg: string }
> = {
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bar: 'bg-[#58CC02]',
    iconBg: 'bg-[#58CC02] border-[#46A302] text-white',
  },
  sky: {
    badge: 'bg-sky-50 text-[#0284C7] border-sky-200',
    bar: 'bg-[#1CB0F6]',
    iconBg: 'bg-[#1CB0F6] border-[#0284C7] text-white',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-[#FFC800]',
    iconBg: 'bg-[#FFC800] border-[#D97706] text-slate-900',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    bar: 'bg-[#8B5CF6]',
    iconBg: 'bg-[#8B5CF6] border-[#6D28D9] text-white',
  },
  coral: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    bar: 'bg-[#FF4B4B]',
    iconBg: 'bg-[#FF4B4B] border-[#DC2626] text-white',
  },
};

function DeckIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'sparkles':
      return <Sparkles className="h-5 w-5" />;
    case 'briefcase':
      return <Briefcase className="h-5 w-5" />;
    case 'graduation-cap':
      return <GraduationCap className="h-5 w-5" />;
    case 'plane':
      return <Plane className="h-5 w-5" />;
    case 'flame':
      return <Flame className="h-5 w-5" />;
    case 'heart':
      return <Heart className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<ProfileOverviewResponse | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [selectedDeckForCards, setSelectedDeckForCards] = useState<Deck | null>(null);

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }

      const [profileRes, decksRes] = await Promise.all([
        lingoloopApi.getProfileOverview(),
        lingoloopApi.getDecks(),
      ]);

      setOverview(profileRes);
      setDecks(decksRes.decks);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data Dashboard. Pastikan Backend berjalan.'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleQuotaUpdated = (nextQuota: QuotaSummary) => {
    setOverview((prev) => (prev ? { ...prev, quota: nextQuota } : prev));
  };

  const handleDeleteDeck = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Hapus deck "${deck.title}" beserta seluruh ${deck.total_cards} kartunya?`
    );
    if (!confirmed) return;

    try {
      await lingoloopApi.deleteDeck(deck.id);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus deck.');
    }
  };

  const dueToday = overview?.stats.due_today ?? 0;
  const masteredWords = overview?.stats.mastered_words ?? 0;
  const totalWords = overview?.stats.total_words ?? 0;
  const streakCount = overview?.stats.streak_count ?? 0;
  const displayName =
    overview?.profile.full_name?.trim() ||
    overview?.profile.email?.split('@')[0] ||
    'Pembelajar';

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-16">
      <AppNavbar
        streakCount={streakCount}
        plan={overview?.profile.plan || 'free'}
        role={overview?.profile.role || 'user'}
        userEmail={overview?.profile.email}
      />

      <main className="mx-auto max-w-6xl space-y-7 px-4 pt-7 sm:px-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {/* Top Stats + Hero Review Banner */}
        <section className="grid gap-5 lg:grid-cols-12">
          {/* Daily Review CTA Banner */}
          <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300 border-b-4 bg-gradient-to-br from-emerald-50 via-white to-sky-50/70 p-6 shadow-sm sm:p-7 lg:col-span-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">
                  <Flame className="h-3.5 w-3.5 fill-[#FFC800] text-amber-500" />
                  Halo, {displayName}!
                </span>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {dueToday > 0
                    ? `Ada ${dueToday} kata siap di-review hari ini!`
                    : 'Semua review hari ini sudah tuntas! 🎉'}
                </h1>
                <p className="mt-1.5 text-sm font-bold text-slate-600">
                  {dueToday > 0
                    ? 'Selesaikan sesi singkat 5 menit untuk menjaga Daily Streak tetap menyala.'
                    : 'Tambahkan kata baru di bawah atau baca Micro-Story untuk memperkuat ingatan.'}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
                <Link href="/study/daily">
                  <TactileButton variant="primary" size="lg" className="w-full sm:w-auto">
                    <Play className="h-5 w-5 fill-current" />
                    Mulai Review Hari Ini ({dueToday} Kata)
                  </TactileButton>
                </Link>
                <Link
                  href="/stories"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-black text-violet-700 hover:underline"
                >
                  <BookMarked className="h-3.5 w-3.5" />
                  Atau buat Micro-Story dari kata sulitmu →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-4">
            <div className="tactile-card flex flex-col justify-between p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Flame className="h-5 w-5 fill-[#FFC800]" />
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-slate-900">{streakCount}</p>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Daily Streak
                </p>
              </div>
            </div>

            <div className="tactile-card flex flex-col justify-between p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#46A302]">
                <Award className="h-5 w-5" />
              </div>
              <div className="mt-3">
                <p className="text-3xl font-black text-slate-900">{masteredWords}</p>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Mastered / {totalWords} Kata
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Add Vocab Bar */}
        <QuickAddVocab
          decks={decks}
          quota={overview?.quota || null}
          onCardSaved={loadDashboard}
          onQuotaUpdated={handleQuotaUpdated}
          onOpenCreateDeck={() => setIsCreateDeckOpen(true)}
        />

        {/* Grid Deck Kosa Kata */}
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-[#1CB0F6]" strokeWidth={2.5} />
              <h2 className="text-xl font-black text-slate-900">Deck Kosa Katamu</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                {decks.length}
              </span>
            </div>

            <TactileButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateDeckOpen(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              Buat Deck Baru
            </TactileButton>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="tactile-card h-52 animate-pulse bg-slate-100/70 p-6" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="tactile-card flex flex-col items-center justify-center p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-[#0284C7]">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-black text-slate-800">
                Belum ada Deck Kosa Kata
              </h3>
              <p className="mt-1 max-w-md text-sm font-bold text-slate-500">
                Buat deck pertamamu (misalnya &ldquo;Kosa Kata Harian&rdquo; atau &ldquo;IELTS
                Reading&rdquo;) untuk mulai menyimpan flashcard.
              </p>
              <TactileButton
                type="button"
                variant="primary"
                className="mt-5"
                onClick={() => setIsCreateDeckOpen(true)}
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
                Buat Deck Pertama
              </TactileButton>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {decks.map((deck) => {
                const theme = THEME_STYLES[deck.color_theme] || THEME_STYLES.emerald;
                return (
                  <div
                    key={deck.id}
                    className="tactile-card group flex flex-col justify-between p-5 transition-transform hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border-b-4 ${theme.iconBg}`}
                        >
                          <DeckIcon icon={deck.icon} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-xs font-black ${theme.badge}`}
                          >
                            {deck.due_cards > 0
                              ? `${deck.due_cards} jatuh tempo`
                              : `${deck.total_cards} kata`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeck(deck)}
                            title="Hapus deck"
                            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="mt-4 text-lg font-black text-slate-800">{deck.title}</h3>
                      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs font-bold leading-relaxed text-slate-500">
                        {deck.description || 'Koleksi flashcard kosa kata bahasa Inggris.'}
                      </p>

                      {/* Progress Penguasaan */}
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-extrabold">
                          <span className="text-slate-500">
                            Penguasaan ({deck.mastered_cards}/{deck.total_cards})
                          </span>
                          <span className="text-slate-700">{deck.progress_percent}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
                            style={{ width: `${Math.max(deck.progress_percent, 4)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <Link href={`/study/${deck.id}`} className="flex-1">
                        <TactileButton
                          type="button"
                          variant="primary"
                          size="sm"
                          fullWidth
                          disabled={deck.total_cards === 0}
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Belajar
                        </TactileButton>
                      </Link>
                      <TactileButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDeckForCards(deck)}
                      >
                        Lihat Kartu
                      </TactileButton>
                    </div>
                  </div>
                );
              })}

              {/* Add Deck Card */}
              <button
                type="button"
                onClick={() => setIsCreateDeckOpen(true)}
                className="flex min-h-[220px] flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-6 text-slate-500 transition-all hover:border-[#1CB0F6] hover:bg-sky-50/40 hover:text-[#0284C7]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <Plus className="h-6 w-6" strokeWidth={3} />
                </span>
                <span className="text-base font-black">+ Buat Deck Baru</span>
                <span className="text-xs font-bold text-slate-400">
                  Kelompokkan kata sesuai topikmu
                </span>
              </button>
            </div>
          )}
        </section>
      </main>

      <CreateDeckModal
        isOpen={isCreateDeckOpen}
        onClose={() => setIsCreateDeckOpen(false)}
        onCreated={loadDashboard}
      />

      <DeckCardsModal
        deck={selectedDeckForCards}
        onClose={() => setSelectedDeckForCards(null)}
        onChanged={loadDashboard}
      />
    </div>
  );
}
