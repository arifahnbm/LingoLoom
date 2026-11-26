'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCw, Volume2 } from 'lucide-react';
import { speakEnglish } from '@/lib/speech';
import { renderHighlightedSentence } from '@/lib/highlight';
import { Flashcard, SpeechAccent } from '@/types/lingoloop';

interface Flashcard3DProps {
  card: Flashcard;
  isFlipped: boolean;
  accent: SpeechAccent;
  onFlip: () => void;
}

export function Flashcard3D({ card, isFlipped, accent, onFlip }: Flashcard3DProps) {
  const [speakingTarget, setSpeakingTarget] = useState<string | null>(null);

  const playAudio = (e: React.MouseEvent, text: string, key: string, useCardAudio = false) => {
    e.stopPropagation();
    speakEnglish(text, {
      accent,
      audioUrl: useCardAudio ? card.audio_url : null,
      onStart: () => setSpeakingTarget(key),
      onEnd: () => setSpeakingTarget(null),
      onError: () => setSpeakingTarget(null),
    });
  };

  return (
    <div
      className="perspective-1200 relative mx-auto h-[410px] w-full max-w-xl cursor-pointer select-none sm:h-[440px]"
      onClick={onFlip}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onFlip();
        }
      }}
      aria-label={`Kartu flashcard ${card.word}`}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 24 }}
        className="preserve-3d relative h-full w-full"
      >
        {/* Sisi Depan */}
        <div className="backface-hidden tactile-card absolute inset-0 flex flex-col items-center justify-between p-7 text-center sm:p-10">
          <div className="flex w-full items-center justify-between">
            {card.part_of_speech ? (
              <span className="rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-[#0284C7]">
                {card.part_of_speech}
              </span>
            ) : (
              <span />
            )}
            <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500">
              {card.repetitions === 0 ? 'Kata Baru' : `Review #${card.repetitions + 1}`}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-black tracking-tight text-slate-800 sm:text-6xl">
              {card.word}
            </h1>
            {card.phonetic && (
              <p className="mt-3 text-lg font-bold text-slate-400 sm:text-xl">
                {card.phonetic}
              </p>
            )}

            <button
              type="button"
              onClick={(e) => playAudio(e, card.word, 'word', true)}
              className={`mt-7 inline-flex items-center gap-2.5 rounded-2xl border-b-4 px-6 py-3 text-base font-extrabold text-white transition-all active:translate-y-1 active:border-b-0 ${
                speakingTarget === 'word'
                  ? 'border-[#46A302] bg-[#58CC02]'
                  : 'border-[#0284C7] bg-[#1CB0F6] hover:bg-[#14A3E8]'
              }`}
            >
              <Volume2
                className={`h-5 w-5 ${speakingTarget === 'word' ? 'animate-pulse' : ''}`}
              />
              Putar Pelafalan ({accent === 'en-US' ? 'US' : 'UK'})
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-400">
            <RotateCw className="h-3.5 w-3.5" />
            Klik kartu atau tekan <kbd className="rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">Spasi</kbd> untuk membalik
          </div>
        </div>

        {/* Sisi Belakang */}
        <div className="backface-hidden rotate-y-180 tactile-card absolute inset-0 flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-white to-emerald-50/35 p-6 text-left sm:p-8">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#58CC02]">
                    Arti Bahasa Indonesia
                  </span>
                  <span className="text-xs font-bold text-slate-400">• {card.word}</span>
                </div>
                <h2 className="mt-1.5 text-2xl font-black leading-snug text-slate-800 sm:text-3xl">
                  {card.meaning_id}
                </h2>
              </div>

              <button
                type="button"
                onClick={(e) => playAudio(e, card.word, 'word-back', true)}
                title="Putar audio"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-b-4 border-[#0284C7] bg-[#1CB0F6] text-white transition-all active:translate-y-0.5 active:border-b-0"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>

            {/* Sinonim pill badges */}
            {card.synonyms && card.synonyms.length > 0 && (
              <div className="mt-4">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Sinonim
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {card.synonyms.map((syn) => (
                    <span
                      key={syn}
                      className="rounded-full border-2 border-slate-200 bg-white px-3 py-0.5 text-xs font-extrabold text-slate-600"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contoh Kalimat */}
            {card.examples && card.examples.length > 0 && (
              <div className="mt-5 space-y-2.5">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Contoh Kalimat
                </span>
                {card.examples.slice(0, 2).map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2.5 rounded-2xl border-2 border-slate-100 bg-white p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-relaxed text-slate-800 sm:text-base">
                        {renderHighlightedSentence(ex.en, card.word)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                        {ex.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => playAudio(e, ex.en, `ex-${i}`)}
                      title="Dengarkan kalimat"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 transition-colors ${
                        speakingTarget === `ex-${i}`
                          ? 'bg-[#58CC02] text-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-sky-50 hover:text-[#1CB0F6]'
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs font-extrabold text-slate-400">
            Nilai seberapa mudah kamu mengingat kata ini di bawah 👇
          </p>
        </div>
      </motion.div>
    </div>
  );
}
