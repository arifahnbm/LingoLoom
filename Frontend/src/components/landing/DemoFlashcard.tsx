'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Sparkles, Volume2 } from 'lucide-react';
import { speakEnglish } from '@/lib/speech';
import { renderHighlightedSentence } from '@/lib/highlight';
import { SpeechAccent } from '@/types/lingoloom';

interface DemoCardData {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningId: string;
  synonyms: string[];
  examples: Array<{ en: string; id: string }>;
}

const DEMO_CARDS: DemoCardData[] = [
  {
    word: 'Serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    partOfSpeech: 'noun',
    meaningId: 'Keberuntungan tak terduga saat menemukan hal berharga',
    synonyms: ['fortuity', 'good fortune', 'chance'],
    examples: [
      {
        en: 'Finding that quiet coffee shop on a rainy day was pure serendipity.',
        id: 'Menemukan kedai kopi tenang di hari hujan itu benar-benar keberuntungan tak terduga.',
      },
      {
        en: 'Meeting my mentor at the bookstore felt like serendipity.',
        id: 'Bertemu mentorku di toko buku terasa seperti kebetulan yang sangat beruntung.',
      },
    ],
  },
  {
    word: 'Resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    partOfSpeech: 'adjective',
    meaningId: 'Tangguh; cepat bangkit dan pulih dari kesulitan',
    synonyms: ['tough', 'adaptable', 'strong'],
    examples: [
      {
        en: 'She stayed resilient even after facing tough challenges at work.',
        id: 'Dia tetap tangguh meskipun menghadapi tantangan berat di tempat kerja.',
      },
      {
        en: 'Building resilient study habits helps you remember vocabulary longer.',
        id: 'Membangun kebiasaan belajar yang tangguh membantumu mengingat kosa kata lebih lama.',
      },
    ],
  },
  {
    word: 'Eloquent',
    phonetic: '/ˈel.ə.kwənt/',
    partOfSpeech: 'adjective',
    meaningId: 'Fasih dan meyakinkan saat berbicara atau menulis',
    synonyms: ['articulate', 'expressive', 'fluent'],
    examples: [
      {
        en: 'His eloquent presentation won over the entire audience.',
        id: 'Presentasinya yang fasih dan meyakinkan berhasil memikat seluruh audiens.',
      },
      {
        en: 'Reading daily stories helps you become a more eloquent speaker.',
        id: 'Membaca cerita setiap hari membantumu menjadi pembicara yang lebih fasih.',
      },
    ],
  },
];

export function DemoFlashcard() {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const card = DEMO_CARDS[index];

  const handleSpeak = (e: React.MouseEvent, text = card.word) => {
    e.stopPropagation();
    speakEnglish(text, {
      accent,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handleNavigate = (dir: -1 | 1) => {
    setIsFlipped(false);
    setIndex((prev) => (prev + dir + DEMO_CARDS.length) % DEMO_CARDS.length);
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Top interactive badge bar */}
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Coba Klik Kartunya!
        </span>

        <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white p-0.5 text-xs font-extrabold">
          {(['en-US', 'en-GB'] as SpeechAccent[]).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setAccent(acc)}
              className={`rounded-lg px-2.5 py-1 transition-colors ${
                accent === acc
                  ? 'bg-[#1CB0F6] text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {acc === 'en-US' ? 'US' : 'UK'}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Flip Container */}
      <div
        className="perspective-1200 relative h-[350px] w-full cursor-pointer select-none sm:h-[370px]"
        onClick={() => setIsFlipped((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        aria-label="Demo flashcard interaktif"
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="preserve-3d relative h-full w-full"
        >
          {/* Front Face */}
          <div className="backface-hidden tactile-card absolute inset-0 flex flex-col items-center justify-between p-6 text-center">
            <div className="flex w-full items-center justify-between">
              <span className="rounded-lg border-2 border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-[#0284C7]">
                {card.partOfSpeech}
              </span>
              <span className="text-xs font-extrabold text-slate-400">
                {index + 1} / {DEMO_CARDS.length}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <h3 className="text-4xl font-black tracking-tight text-slate-800 sm:text-5xl">
                {card.word}
              </h3>
              <p className="mt-2 text-lg font-bold text-slate-400">{card.phonetic}</p>

              <button
                type="button"
                onClick={(e) => handleSpeak(e)}
                className={`mt-6 inline-flex items-center gap-2 rounded-2xl border-b-4 px-5 py-2.5 text-sm font-extrabold text-white transition-all active:translate-y-1 active:border-b-0 ${
                  isSpeaking
                    ? 'border-[#46A302] bg-[#58CC02]'
                    : 'border-[#0284C7] bg-[#1CB0F6] hover:bg-[#14A3E8]'
                }`}
              >
                <Volume2 className={`h-5 w-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                Dengarkan ({accent === 'en-US' ? 'US' : 'UK'})
              </button>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-400">
              <RotateCw className="h-3.5 w-3.5" />
              Klik kartu untuk lihat arti & contoh
            </div>
          </div>

          {/* Back Face */}
          <div className="backface-hidden rotate-y-180 tactile-card absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/40 p-6 text-left">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-[#58CC02]">
                    Arti Bahasa Indonesia
                  </span>
                  <h4 className="mt-1 text-xl font-black leading-snug text-slate-800">
                    {card.meaningId}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e)}
                  title="Putar audio kata"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-b-4 border-[#0284C7] bg-[#1CB0F6] text-white active:translate-y-0.5 active:border-b-0"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>

              {/* Synonyms */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.synonyms.map((syn) => (
                  <span
                    key={syn}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-extrabold text-slate-600"
                  >
                    {syn}
                  </span>
                ))}
              </div>

              {/* Examples */}
              <div className="mt-4 space-y-2.5">
                {card.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-xl border-2 border-slate-100 bg-white p-3 text-sm"
                  >
                    <p className="font-bold leading-relaxed text-slate-800">
                      {renderHighlightedSentence(ex.en, card.word)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{ex.id}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-xs font-extrabold text-slate-400">
              Klik lagi untuk kembali ke depan
            </div>
          </div>
        </motion.div>
      </div>

      {/* Card switcher */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => handleNavigate(-1)}
          aria-label="Kata sebelumnya"
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 border-b-4 bg-white text-slate-600 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1.5">
          {DEMO_CARDS.map((c, idx) => (
            <button
              key={c.word}
              type="button"
              onClick={() => {
                setIsFlipped(false);
                setIndex(idx);
              }}
              aria-label={`Pilih kartu ${c.word}`}
              className={`h-2.5 rounded-full transition-all ${
                idx === index ? 'w-7 bg-[#58CC02]' : 'w-2.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => handleNavigate(1)}
          aria-label="Kata berikutnya"
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-200 border-b-4 bg-white text-slate-600 transition-all hover:bg-slate-50 active:translate-y-0.5 active:border-b-2"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
