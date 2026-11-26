'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Database,
  PenLine,
  Plus,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { TactileButton } from '@/components/ui/TactileButton';
import { ApiError, lingoloopApi } from '@/lib/api';
import { speakEnglish } from '@/lib/speech';
import {
  AutoFillContext,
  Deck,
  ExampleSentence,
  QuotaSummary,
} from '@/types/lingoloop';

interface QuickAddVocabProps {
  decks: Deck[];
  quota: QuotaSummary | null;
  onCardSaved: () => void;
  onQuotaUpdated: (quota: QuotaSummary) => void;
  onOpenCreateDeck: () => void;
}

export function QuickAddVocab({
  decks,
  quota,
  onCardSaved,
  onQuotaUpdated,
  onOpenCreateDeck,
}: QuickAddVocabProps) {
  const [word, setWord] = useState('');
  const [context, setContext] = useState<AutoFillContext>('daily');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [meaningId, setMeaningId] = useState('');
  const [synonymsInput, setSynonymsInput] = useState('');
  const [examples, setExamples] = useState<ExampleSentence[]>([
    { en: '', id: '' },
    { en: '', id: '' },
  ]);

  const [sourceBadge, setSourceBadge] = useState<'cache' | 'gemini' | 'mock' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!selectedDeckId && decks.length > 0) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  const resetForm = () => {
    setWord('');
    setPhonetic('');
    setPartOfSpeech('');
    setMeaningId('');
    setSynonymsInput('');
    setExamples([
      { en: '', id: '' },
      { en: '', id: '' },
    ]);
    setSourceBadge(null);
    setIsExpanded(false);
    setErrorMsg('');
  };

  const handleAutoFill = async () => {
    const cleaned = word.trim();
    if (!cleaned) {
      setErrorMsg('Ketik satu kata bahasa Inggris terlebih dahulu, misalnya "Resilient".');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsExpanded(true);
    setIsAutoFilling(true);

    try {
      const result = await lingoloopApi.autoFillVocab(cleaned, context);
      setWord(result.word || cleaned);
      setPhonetic(result.phonetic || '');
      setPartOfSpeech(result.part_of_speech || '');
      setMeaningId(result.meaning_id || '');
      setSynonymsInput((result.synonyms || []).join(', '));
      setExamples(
        result.examples && result.examples.length > 0
          ? result.examples
          : [
              { en: '', id: '' },
              { en: '', id: '' },
            ]
      );
      setSourceBadge(result.cached ? 'cache' : result.source || 'gemini');
      if (result.quota) {
        onQuotaUpdated(result.quota);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
        if (err.quota) {
          onQuotaUpdated(err.quota);
        }
      } else {
        setErrorMsg('Gagal mengisi otomatis dengan AI. Kamu tetap bisa mengisi manual di bawah.');
      }
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!word.trim() || !meaningId.trim()) {
      setErrorMsg('Kata bahasa Inggris dan arti bahasa Indonesia wajib diisi.');
      return;
    }

    if (!selectedDeckId) {
      setErrorMsg('Buat atau pilih Deck tujuan terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanedExamples = examples
        .map((ex) => ({ en: ex.en.trim(), id: ex.id.trim() }))
        .filter((ex) => ex.en && ex.id);

      const cleanedSynonyms = synonymsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await lingoloopApi.createCard({
        deck_id: selectedDeckId,
        word: word.trim(),
        phonetic: phonetic.trim(),
        part_of_speech: partOfSpeech.trim(),
        meaning_id: meaningId.trim(),
        synonyms: cleanedSynonyms,
        examples: cleanedExamples,
      });

      setSuccessMsg(`Kata "${word.trim()}" berhasil disimpan ke deck!`);
      resetForm();
      onCardSaved();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan kartu.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateExample = (idx: number, field: 'en' | 'id', value: string) => {
    setExamples((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const quotaText = quota
    ? quota.is_pro
      ? 'Pro Unlimited'
      : `Sisa ${quota.autofill.remaining ?? 0}/${quota.autofill.daily_limit ?? 5} hari ini`
    : 'AI 5 Detik';

  return (
    <section className="tactile-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-800">Tambah Kosa Kata Cepat</h2>
            <p className="text-xs font-bold text-slate-500">
              Ketik 1 kata bahasa Inggris — biarkan AI mengisi arti, phonetic, dan contoh kalimat dalam 5 detik!
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          {quotaText}
        </span>
      </div>

      {/* Quick input row */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isExpanded) {
                e.preventDefault();
                handleAutoFill();
              }
            }}
            placeholder='Ketik kata Inggris, misal: "Ubiquitous" atau "Pragmatic"...'
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3 text-base font-bold text-slate-800 placeholder:text-slate-400 focus:border-[#1CB0F6] focus:bg-white focus:outline-none"
          />
          {word.trim() && (
            <button
              type="button"
              onClick={() => speakEnglish(word)}
              title="Dengarkan pelafalan"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-sky-50 hover:text-[#1CB0F6]"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          )}
        </div>

        <select
          value={context}
          onChange={(e) => setContext(e.target.value as AutoFillContext)}
          aria-label="Konteks contoh kalimat"
          className="rounded-xl border-2 border-slate-200 bg-white px-3.5 py-3 text-sm font-extrabold text-slate-700 focus:border-[#1CB0F6] focus:outline-none"
        >
          <option value="daily">Konteks: Harian</option>
          <option value="work">Konteks: Kerja</option>
          <option value="academic">Konteks: Akademik</option>
        </select>

        <TactileButton
          type="button"
          variant="violet"
          onClick={handleAutoFill}
          disabled={isAutoFilling}
          className="shrink-0"
        >
          <Sparkles className={`h-4 w-4 ${isAutoFilling ? 'animate-spin' : ''}`} />
          {isAutoFilling ? 'Mengisi AI...' : 'Isi Otomatis AI'}
        </TactileButton>

        {!isExpanded && (
          <TactileButton
            type="button"
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="shrink-0"
          >
            <PenLine className="h-4 w-4" />
            Manual
          </TactileButton>
        )}
      </div>

      {/* Feedback alerts */}
      {errorMsg && (
        <div className="mt-3 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Skeleton loading state */}
      {isAutoFilling && (
        <div className="mt-5 animate-pulse space-y-4 rounded-2xl border-2 border-violet-100 bg-violet-50/40 p-5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-violet-600">
            <Sparkles className="h-4 w-4 animate-spin" />
            Meracik phonetic, arti Indonesia, sinonim, dan contoh kalimat...
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-11 rounded-xl bg-violet-100" />
            <div className="h-11 rounded-xl bg-violet-100" />
            <div className="h-11 rounded-xl bg-violet-100" />
          </div>
          <div className="h-16 rounded-xl bg-violet-100/80" />
          <div className="h-16 rounded-xl bg-violet-100/80" />
        </div>
      )}

      {/* Expanded Editable Card Form */}
      {isExpanded && !isAutoFilling && (
        <form
          onSubmit={handleSaveCard}
          className="mt-5 space-y-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-700">Detail Flashcard</span>
              {sourceBadge === 'cache' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700">
                  <Database className="h-3 w-3" />
                  Instan dari Global Cache
                </span>
              )}
              {sourceBadge === 'gemini' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  Diisi oleh Gemini AI
                </span>
              )}
              {sourceBadge === 'mock' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                  Pratinjau AI Mock
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-500 hover:bg-slate-200/70"
            >
              <X className="h-3.5 w-3.5" />
              Tutup
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Phonetic (IPA)
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="/rɪˈzɪl.jənt/"
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:border-[#1CB0F6] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Jenis Kata
              </label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="adjective, noun, verb..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:border-[#1CB0F6] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Sinonim (pisah koma)
              </label>
              <input
                type="text"
                value={synonymsInput}
                onChange={(e) => setSynonymsInput(e.target.value)}
                placeholder="tough, adaptable, strong"
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 focus:border-[#1CB0F6] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Arti Bahasa Indonesia *
            </label>
            <input
              type="text"
              required
              value={meaningId}
              onChange={(e) => setMeaningId(e.target.value)}
              placeholder="Contoh: Tangguh; cepat pulih dari kesulitan"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-[#58CC02] focus:outline-none"
            />
          </div>

          {/* Examples */}
          <div className="space-y-2.5">
            <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Contoh Kalimat (Opsional)
            </label>
            {examples.map((ex, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl border-2 border-slate-200 bg-white p-3 sm:grid-cols-2"
              >
                <input
                  type="text"
                  value={ex.en}
                  onChange={(e) => updateExample(idx, 'en', e.target.value)}
                  placeholder={`Contoh kalimat Inggris #${idx + 1}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#1CB0F6] focus:outline-none"
                />
                <input
                  type="text"
                  value={ex.id}
                  onChange={(e) => updateExample(idx, 'id', e.target.value)}
                  placeholder={`Terjemahan Indonesia #${idx + 1}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 focus:border-[#1CB0F6] focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Deck selection & Save */}
          <div className="flex flex-col items-stretch justify-between gap-3 border-t-2 border-slate-200 pt-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                Simpan ke Deck:
              </label>
              {decks.length > 0 ? (
                <select
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 focus:border-[#58CC02] focus:outline-none"
                >
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.title} ({deck.total_cards} kata)
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCreateDeck}
                  className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat Deck Pertama
                </button>
              )}
            </div>

            <TactileButton
              type="submit"
              variant="primary"
              disabled={isSaving || decks.length === 0}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
              {isSaving ? 'Menyimpan...' : 'Simpan Kartu'}
            </TactileButton>
          </div>
        </form>
      )}
    </section>
  );
}
