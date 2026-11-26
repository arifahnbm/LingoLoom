import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Flame,
  Infinity as InfinityIcon,
  Sparkles,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { DemoFlashcard } from '@/components/landing/DemoFlashcard';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-800">
      {/* Clean Sticky Navbar */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-200/80 bg-[#FFFDF9]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo href="/" />

          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#fitur"
              className="text-sm font-extrabold text-slate-600 transition-colors hover:text-[#58CC02]"
            >
              Fitur
            </a>
            <a
              href="#harga"
              className="text-sm font-extrabold text-slate-600 transition-colors hover:text-[#58CC02]"
            >
              Harga
            </a>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border-2 border-slate-200 border-b-4 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-b-4 border-[#46A302] bg-[#58CC02] px-4 py-2 text-sm font-extrabold text-white transition-all hover:bg-[#52BF02] active:translate-y-1 active:border-b-0 sm:px-5"
            >
              Mulai Gratis
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24 lg:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12">
            {/* Copywriting */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-black text-amber-800">
                <Flame className="h-4 w-4 fill-[#FFC800] text-amber-500" />
                Belajar Kosa Kata Inggris Lebih Seru & Nempel Lama
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                Hafal Kosa Kata Inggris{' '}
                <span className="relative inline-block text-[#58CC02]">
                  Tanpa Gampang Lupa
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base font-bold leading-relaxed text-slate-600 sm:text-lg">
                LingoLoop menggabungkan <strong>Flashcard SRS pintar (SM-2)</strong>,{' '}
                <strong>AI Auto-Fill 5 Detik</strong>, dan{' '}
                <strong>Contextual Micro-Stories</strong> agar setiap kata baru langsung
                melekat di memori jangka panjangmu.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] px-7 py-4 text-base font-black text-white transition-all hover:bg-[#52BF02] active:translate-y-1 active:border-b-0"
                >
                  Mulai Belajar Gratis
                  <ArrowRight className="h-5 w-5" strokeWidth={3} />
                </Link>
                <a
                  href="#fitur"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 border-b-4 bg-white px-6 py-3.5 text-base font-extrabold text-slate-700 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
                >
                  Lihat Cara Kerjanya
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-extrabold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#58CC02]" strokeWidth={3} />
                  Unlimited kartu teks gratis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#58CC02]" strokeWidth={3} />
                  Audio pelafalan US & UK instan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#58CC02]" strokeWidth={3} />
                  Tanpa kartu kredit
                </span>
              </div>
            </div>

            {/* Interactive Demo Flashcard Widget */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl border-2 border-slate-200/80 bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/70 p-5 sm:p-8">
                <DemoFlashcard />
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Keunggulan */}
        <section id="fitur" className="border-t-2 border-slate-100 bg-white px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-[#0284C7]">
                <Zap className="h-3.5 w-3.5" />3 Pilar LingoLoop
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Dirancang agar Otakmu Belajar Lebih Ringan, Bukan Lebih Keras
              </h2>
              <p className="mt-3 text-base font-bold text-slate-500">
                Tidak ada lagi tabel hafalan membosankan. Cukup 5–10 menit sehari dengan ritme
                yang terbukti secara ilmiah.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-12">
              {/* Pillar 1 */}
              <div className="tactile-card flex flex-col justify-between p-7 md:col-span-5">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] text-white">
                    <InfinityIcon className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-5 text-2xl font-black text-slate-800">
                    Unlimited Basic Flashcards + SRS SM-2
                  </h3>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
                    Buat deck dan kartu sebanyak yang kamu mau secara gratis. Algoritma{' '}
                    <strong>Spaced Repetition (SM-2)</strong> otomatis menjadwalkan ulang kata
                    tepat sebelum kamu melupakannya.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="rounded-xl bg-[#FF4B4B]/10 px-3 py-1 text-xs font-black text-[#FF4B4B]">
                    Lupa • 10 mnt
                  </span>
                  <span className="rounded-xl bg-[#FF9600]/10 px-3 py-1 text-xs font-black text-[#FF9600]">
                    Susah • 1 hari
                  </span>
                  <span className="rounded-xl bg-[#1CB0F6]/15 px-3 py-1 text-xs font-black text-[#0284C7]">
                    Ingat • 6 hari
                  </span>
                  <span className="rounded-xl bg-[#58CC02]/15 px-3 py-1 text-xs font-black text-[#46A302]">
                    Mudah • 10 hari
                  </span>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="tactile-card flex flex-col justify-between bg-gradient-to-br from-white to-violet-50/60 p-7 md:col-span-7">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-b-4 border-[#6D28D9] bg-[#8B5CF6] text-white">
                      <Wand2 className="h-7 w-7" strokeWidth={2.5} />
                    </div>
                    <span className="rounded-full border-2 border-violet-200 bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                      AI Auto-Fill 5 Detik
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-black text-slate-800">
                    Ketik 1 Kata, Kartu Lengkap Langsung Jadi
                  </h3>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
                    Tidak perlu bolak-balik kamus. Ketik satu kata bahasa Inggris dan pilih
                    konteks (Harian, Kerja, atau Akademik) — AI langsung mengisi phonetic IPA,
                    arti Indonesia natural, sinonim, dan 2 contoh kalimat siap pakai.
                  </p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Phonetic IPA', val: '/məˈtɪk.jə.ləs/' },
                    { label: 'Arti Natural', val: 'Sangat teliti' },
                    { label: 'Audio Gratis', val: 'Aksen US & UK' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border-2 border-violet-100 bg-white p-3"
                    >
                      <span className="block text-[11px] font-black uppercase tracking-wide text-violet-500">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-sm font-extrabold text-slate-800">
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pillar 3 - Full Width Bento */}
              <div className="tactile-card grid items-center gap-6 bg-gradient-to-r from-amber-50/70 via-white to-sky-50/70 p-7 md:col-span-12 md:grid-cols-12">
                <div className="md:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Contextual Micro-Stories
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-slate-800 sm:text-3xl">
                    Sulit Menghafal Beberapa Kata? Jadikan Cerita Pendek!
                  </h3>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600 sm:text-base">
                    AI otomatis memilih 5–7 kata yang paling sering kamu lupa dan merangkainya
                    menjadi cerita bahasa Inggris yang seru. Klik kata yang disorot untuk melihat
                    arti & catatan konteks, lengkap dengan mini audio player.
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 md:col-span-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Cuplikan Micro-Story
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-[#0284C7]">
                      <Volume2 className="h-3.5 w-3.5" /> Audio Ready
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700">
                    &ldquo;Even on hectic mornings, Nadia stayed{' '}
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-900">
                      resilient
                    </span>{' '}
                    and took{' '}
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-900">
                      meticulous
                    </span>{' '}
                    notes before her{' '}
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-900">
                      eloquent
                    </span>{' '}
                    speech.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="harga" className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">
                <Brain className="h-3.5 w-3.5" />
                Transparan & Ramah Pelajar
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Mulai Gratis Selamanya, Upgrade Saat Butuh AI Tanpa Batas
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Free Plan */}
              <div className="tactile-card flex flex-col justify-between p-7 sm:p-8">
                <div>
                  <span className="inline-block rounded-xl bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600">
                    Paket Gratis
                  </span>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">Rp 0</span>
                    <span className="text-sm font-bold text-slate-500">/ selamanya</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Semua kebutuhan inti belajar kosa kata tanpa batasan jumlah kartu.
                  </p>

                  <ul className="mt-6 space-y-3 text-sm font-extrabold text-slate-700">
                    {[
                      'Unlimited Deck & Basic Flashcard Teks',
                      'Algoritma SRS SM-2 & Pelacakan Daily Streak',
                      'Audio Pelafalan US & UK Gratis (Web Speech API)',
                      'AI Auto-Fill hingga 5 kata / hari',
                      'Contextual Micro-Story 1 cerita / minggu',
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#46A302]">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border-2 border-slate-200 border-b-4 bg-white px-5 py-3.5 text-base font-black text-slate-700 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
                >
                  Mulai Gratis Sekarang
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="relative flex flex-col justify-between rounded-2xl border-2 border-violet-300 border-b-4 bg-gradient-to-b from-violet-50/70 to-white p-7 shadow-sm sm:p-8">
                <span className="absolute -top-3.5 right-6 rounded-full border-2 border-amber-300 bg-[#FFC800] px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-900">
                  Paling Populer
                </span>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-violet-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    LingoLoop Pro
                  </span>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900">Rp 39rb</span>
                    <span className="text-sm font-bold text-slate-500">/ bulan</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    Untuk persiapan IELTS, TOEFL, karier internasional, dan pembelajar aktif.
                  </p>

                  <ul className="mt-6 space-y-3 text-sm font-extrabold text-slate-700">
                    {[
                      'Semua fitur di Paket Gratis',
                      'AI Auto-Fill 5 Detik TANPA BATAS (Harian, Kerja, Akademik)',
                      'Contextual Micro-Stories TANPA BATAS setiap minggu',
                      'Pilihan level cerita Pemula, Menengah, hingga Mahir',
                      'Prioritas fitur audio & statistik memori lanjutan',
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/register"
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#6D28D9] bg-[#8B5CF6] px-5 py-3.5 text-base font-black text-white transition-all hover:bg-[#7C3AED] active:translate-y-1 active:border-b-0"
                >
                  <Sparkles className="h-4 w-4" />
                  Coba LingoLoop Sekarang
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-slate-200/80 bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo href="/" size="sm" />
          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
            <BookOpen className="h-4 w-4 text-[#58CC02]" />
            Dibangun untuk membantu pembelajar Indonesia menguasai kosa kata Inggris dengan bahagia.
          </p>
        </div>
      </footer>
    </div>
  );
}
