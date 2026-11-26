'use client';

import React, { useEffect, useState } from 'react';
import { Trash2, Volume2, X } from 'lucide-react';
import { lingoloomApi } from '@/lib/api';
import { speakEnglish } from '@/lib/speech';
import { Deck, Flashcard } from '@/types/lingoloom';

interface DeckCardsModalProps {
  deck: Deck | null;
  onClose: () => void;
  onChanged: () => void;
}

export function DeckCardsModal({ deck, onClose, onChanged }: DeckCardsModalProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deck) return;
    setLoading(true);
    lingoloomApi
      .getDeckCards(deck.id)
      .then((res) => setCards(res.cards))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [deck]);

  if (!deck) return null;

  const handleDeleteCard = async (cardId: string) => {
    await lingoloomApi.deleteCard(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="tactile-card flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-xl font-black text-slate-800">{deck.title}</h3>
            <p className="text-xs font-bold text-slate-500">
              {cards.length} kartu tersimpan di deck ini
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-extrabold text-slate-500">
                Belum ada kartu di deck ini. Tambahkan kata lewat Quick Add di atas Dashboard!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-black text-slate-800">{card.word}</span>
                      {card.phonetic && (
                        <span className="text-xs font-bold text-slate-400">{card.phonetic}</span>
                      )}
                      {card.part_of_speech && (
                        <span className="rounded-md bg-sky-100 px-2 py-0.5 text-[11px] font-extrabold text-sky-700">
                          {card.part_of_speech}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm font-bold text-slate-600">{card.meaning_id}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      Repetisi: {card.repetitions} • Lupa: {card.lapses} • Interval:{' '}
                      {card.interval_days} hari
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => speakEnglish(card.word, { audioUrl: card.audio_url })}
                      title="Putar audio"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-sky-200 bg-sky-50 text-[#0284C7] hover:bg-sky-100"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      title="Hapus kartu"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
