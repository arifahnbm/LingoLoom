'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Languages,
  Play,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { TactileButton } from '@/components/ui/TactileButton';
import { tokenizeStory } from '@/lib/highlight';
import { speakEnglish, stopSpeaking } from '@/lib/speech';
import { HighlightedWord, MicroStory, SpeechAccent } from '@/types/lingoloom';

interface InteractiveStoryReaderProps {
  story: MicroStory;
}

export function InteractiveStoryReader({ story }: InteractiveStoryReaderProps) {
  const [selectedWord, setSelectedWord] = useState<HighlightedWord | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isPlayingStory, setIsPlayingStory] = useState(false);
  const [accent, setAccent] = useState<SpeechAccent>('en-US');
  const [rate, setRate] = useState<number>(0.95);

  useEffect(() => {
    setSelectedWord(null);
    stopSpeaking();
    setIsPlayingStory(false);
    return () => {
      stopSpeaking();
    };
  }, [story.id]);

  const segments = useMemo(
    () => tokenizeStory(story.story_en, story.target_words || []),
    [story.story_en, story.target_words]
  );

  const handleToggleStoryAudio = () => {
    if (isPlayingStory) {
      stopSpeaking();
      setIsPlayingStory(false);
      return;
    }

    speakEnglish(story.story_en, {
      accent,
      rate,
      onStart: () => setIsPlayingStory(true),
      onEnd: () => setIsPlayingStory(false),
      onError: () => setIsPlayingStory(false),
    });
  };

  const handlePronounceWord = (word: string) => {
    setIsPlayingStory(false);
    speakEnglish(word, { accent, rate: 0.92 });
  };

  return (
    <article className="tactile-card overflow-hidden">
      {/* Mini Audio Player Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-2.5">
          <TactileButton
            type="button"
            variant={isPlayingStory ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleToggleStoryAudio}
          >
            {isPlayingStory ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                Berhenti
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Dengarkan Cerita
              </>
            )}
          </TactileButton>

          {/* Accent toggle */}
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

          {/* Speed selector */}
          <select
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-label="Kecepatan audio cerita"
            className="rounded-xl border-2 border-slate-200 bg-white px-2.5 py-1.5 text-xs font-extrabold text-slate-600 focus:border-[#1CB0F6] focus:outline-none"
          >
            <option value={0.8}>0.8x Lambat</option>
            <option value={0.95}>1.0x Normal</option>
            <option value={1.15}>1.15x Cepat</option>
          </select>
        </div>

        <TactileButton
          type="button"
          variant={showTranslation ? 'amber' : 'outline'}
          size="sm"
          onClick={() => setShowTranslation((prev) => !prev)}
        >
          <Languages className="h-4 w-4" />
          {showTranslation ? 'Sembunyikan Terjemahan' : 'Lihat Terjemahan ID'}
        </TactileButton>
      </div>

      {/* Story Canvas */}
      <div className="p-6 sm:p-8">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Klik kata yang disorot untuk melihat arti & audio
        </div>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
          {story.title}
        </h2>

        {/* Interactive English paragraph */}
        <p className="mt-5 text-lg font-semibold leading-[1.95] text-slate-700 sm:text-xl sm:leading-[2]">
          {segments.map((seg, idx) => {
            if (!seg.highlight) {
              return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
            }

            const isSelected =
              selectedWord?.word.toLowerCase() === seg.highlight.word.toLowerCase();

            return (
              <span key={idx} className="relative inline-block">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedWord(isSelected ? null : seg.highlight || null)
                  }
                  onMouseEnter={() => setSelectedWord(seg.highlight || null)}
                  className={`mx-0.5 inline-flex items-center rounded-lg border-b-2 px-2 py-0.5 font-black transition-all ${
                    isSelected
                      ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                      : 'border-amber-300 bg-amber-100/90 text-amber-950 hover:bg-amber-200'
                  }`}
                >
                  {seg.text}
                </button>
              </span>
            );
          })}
        </p>

        {/* Active Word Popover Card */}
        {selectedWord && (
          <div className="mt-6 rounded-2xl border-2 border-violet-200 border-b-4 bg-violet-50/70 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-black text-violet-950">
                    {selectedWord.word}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePronounceWord(selectedWord.word)}
                    className="inline-flex items-center gap-1 rounded-xl border-b-2 border-[#0284C7] bg-[#1CB0F6] px-3 py-1 text-xs font-extrabold text-white active:translate-y-0.5 active:border-b-0"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Dengar
                  </button>
                </div>
                <p className="mt-1.5 text-base font-extrabold text-slate-800">
                  {selectedWord.meaning_id}
                </p>
                {selectedWord.context_note && (
                  <p className="mt-1 text-sm font-semibold text-violet-800/85">
                    {selectedWord.context_note}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="rounded-lg p-1 text-violet-400 hover:bg-violet-100 hover:text-violet-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Indonesian Translation Drawer */}
        {showTranslation && (
          <div className="mt-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
              Terjemahan Bahasa Indonesia
            </span>
            <p className="mt-2 text-base font-semibold leading-relaxed text-slate-700">
              {story.story_id}
            </p>
          </div>
        )}

        {/* Glossary Chips */}
        {story.target_words && story.target_words.length > 0 && (
          <div className="mt-7 border-t-2 border-slate-100 pt-5">
            <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
              Kata Target dalam Cerita Ini ({story.target_words.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {story.target_words.map((item) => (
                <button
                  key={item.word}
                  type="button"
                  onClick={() => {
                    setSelectedWord(item);
                    handlePronounceWord(item.word);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 border-b-4 bg-white px-3 py-1.5 text-sm font-extrabold text-slate-700 transition-all hover:border-amber-300 hover:bg-amber-50 active:translate-y-0.5 active:border-b-2"
                >
                  <Volume2 className="h-3.5 w-3.5 text-[#1CB0F6]" />
                  <span>{item.word}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    — {item.meaning_id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
