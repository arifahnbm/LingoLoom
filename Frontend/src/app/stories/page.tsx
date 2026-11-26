'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  Calendar,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { TactileButton } from '@/components/ui/TactileButton';
import { InteractiveStoryReader } from '@/components/stories/InteractiveStoryReader';
import { createClient } from '@/lib/supabase/client';
import { ApiError, lingoloomApi } from '@/lib/api';
import {
  MicroStory,
  ProfileOverviewResponse,
  QuotaSummary,
  StoryLevel,
} from '@/types/lingoloom';

export default function StoriesPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<ProfileOverviewResponse | null>(null);
  const [stories, setStories] = useState<MicroStory[]>([]);
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [level, setLevel] = useState<StoryLevel>('intermediate');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadStories = useCallback(async () => {
    setError('');
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }

      const [profileRes, storiesRes] = await Promise.all([
        lingoloomApi.getProfileOverview(),
        lingoloomApi.getStories(),
      ]);

      setOverview(profileRes);
      setStories(storiesRes.stories);
      setQuota(storiesRes.quota);
      if (storiesRes.stories.length > 0) {
        setActiveStoryId((prev) => prev || storiesRes.stories[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat halaman Micro-Stories.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const handleGenerateStory = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await lingoloomApi.generateStory(level);
      setStories((prev) => [res.story, ...prev]);
      setActiveStoryId(res.story.id);
      setQuota(res.quota);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.quota) setQuota(err.quota);
      } else {
        setError('Gagal membuat cerita mikro. Pastikan AI Service & Backend berjalan.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    await lingoloomApi.deleteStory(storyId);
    setStories((prev) => {
      const next = prev.filter((s) => s.id !== storyId);
      if (activeStoryId === storyId) {
        setActiveStoryId(next[0]?.id || null);
      }
      return next;
    });
  };

  const activeStory = stories.find((s) => s.id === activeStoryId) || stories[0] || null;

  const quotaLabel = quota
    ? quota.is_pro
      ? 'Pro Unlimited'
      : `Kuota Gratis: ${quota.micro_stories.remaining ?? 0}/${
          quota.micro_stories.weekly_limit ?? 1
        } minggu ini`
    : 'AI Micro-Story';

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-16">
      <AppNavbar
        streakCount={overview?.stats.streak_count ?? 0}
        plan={overview?.profile.plan || 'free'}
        userEmail={overview?.profile.email}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-7 sm:px-6">
        {/* Hero Generator Banner */}
        <section className="tactile-card bg-gradient-to-r from-violet-50/80 via-white to-amber-50/70 p-6 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Contextual Micro-Stories
                </span>
                <span className="rounded-full border-2 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                  {quotaLabel}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Belajar Kata Sulit Lewat Cerita Pendek Interaktif
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm font-bold text-slate-600">
                AI otomatis memilih 5–7 kata dengan tingkat lupa tertinggi atau kata terbarumu,
                lalu merangkainya menjadi cerita seru lengkap dengan tooltip arti dan audio.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as StoryLevel)}
                aria-label="Tingkat kesulitan cerita"
                className="rounded-xl border-2 border-slate-200 bg-white px-3.5 py-3 text-sm font-extrabold text-slate-700 focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="beginner">Level: Pemula (A2–B1)</option>
                <option value="intermediate">Level: Menengah (B1–B2)</option>
                <option value="advanced">Level: Mahir (C1)</option>
              </select>

              <TactileButton
                type="button"
                variant="violet"
                size="lg"
                onClick={handleGenerateStory}
                disabled={generating}
                className="shrink-0"
              >
                <Wand2 className={`h-5 w-5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Merangkai Cerita AI...' : 'Buat Cerita dari Kata Sulitku'}
              </TactileButton>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}
        </section>

        {/* Loading skeleton while generating */}
        {generating && (
          <div className="tactile-card animate-pulse space-y-4 border-violet-200 bg-violet-50/40 p-7">
            <div className="flex items-center gap-2 text-sm font-black text-violet-700">
              <Sparkles className="h-4 w-4 animate-spin" />
              Sedang menenun kosa katamu menjadi cerita bahasa Inggris yang menarik...
            </div>
            <div className="h-7 w-2/3 rounded-xl bg-violet-100" />
            <div className="space-y-2.5">
              <div className="h-4 w-full rounded-lg bg-violet-100" />
              <div className="h-4 w-11/12 rounded-lg bg-violet-100" />
              <div className="h-4 w-10/12 rounded-lg bg-violet-100" />
            </div>
          </div>
        )}

        {/* Stories Workspace */}
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="tactile-card h-64 animate-pulse bg-slate-100/70 lg:col-span-4" />
            <div className="tactile-card h-96 animate-pulse bg-slate-100/70 lg:col-span-8" />
          </div>
        ) : stories.length === 0 ? (
          <div className="tactile-card flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <BookMarked className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-800">
              Belum Ada Micro-Story Tersimpan
            </h2>
            <p className="mt-2 max-w-md text-sm font-bold text-slate-500">
              Klik tombol <strong>&ldquo;Buat Cerita dari Kata Sulitku&rdquo;</strong> di atas
              untuk menghasilkan cerita pertamamu, atau pastikan kamu sudah memiliki minimal 3
              kartu di Dashboard.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <TactileButton
                type="button"
                variant="violet"
                onClick={handleGenerateStory}
                disabled={generating}
              >
                <Sparkles className="h-4 w-4" />
                Buat Cerita Pertamaku
              </TactileButton>
              <Link href="/dashboard">
                <TactileButton type="button" variant="outline">
                  <BookOpen className="h-4 w-4" />
                  Tambah Kata di Dashboard
                </TactileButton>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Story List Sidebar */}
            <aside className="space-y-3 lg:col-span-4">
              <h2 className="px-1 text-sm font-black uppercase tracking-wider text-slate-400">
                Koleksi Ceritamu ({stories.length})
              </h2>
              <div className="space-y-2.5">
                {stories.map((story) => {
                  const isActive = activeStory?.id === story.id;
                  const formattedDate = new Date(story.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={story.id}
                      onClick={() => setActiveStoryId(story.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveStoryId(story.id);
                      }}
                      className={`group flex cursor-pointer items-start justify-between gap-2 rounded-2xl border-2 border-b-4 p-4 transition-all ${
                        isActive
                          ? 'border-violet-400 bg-violet-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-base font-black text-slate-800">
                          {story.title}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{story.target_words?.length || 0} kata</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story.id);
                        }}
                        title="Hapus cerita"
                        className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Active Story Interactive Reader */}
            <div className="lg:col-span-8">
              {activeStory && <InteractiveStoryReader story={activeStory} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
