import React from 'react';
import { HighlightedWord } from '@/types/lingoloom';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Menandai kata target di dalam contoh kalimat dengan warna highlight cerah.
 */
export function renderHighlightedSentence(sentence: string, targetWord: string): React.ReactNode {
  const cleaned = targetWord.trim();
  if (!cleaned) return sentence;

  const regex = new RegExp(`(${escapeRegExp(cleaned)}\\w*)`, 'gi');
  const parts = sentence.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase().startsWith(cleaned.toLowerCase())) {
      return (
        <mark
          key={index}
          className="rounded-md bg-amber-100 px-1.5 py-0.5 font-extrabold text-amber-900 ring-1 ring-amber-300/80"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export interface StorySegment {
  text: string;
  highlight?: HighlightedWord;
}

/**
 * Memecah paragraf micro-story menjadi segmen teks biasa dan kata target interaktif.
 */
export function tokenizeStory(story: string, words: HighlightedWord[]): StorySegment[] {
  if (!story || !words.length) {
    return [{ text: story }];
  }

  // Urutkan kata paling panjang dulu agar frasa tidak terpotong kata pendek
  const sorted = [...words]
    .filter((w) => w.word?.trim())
    .sort((a, b) => b.word.length - a.word.length);

  if (!sorted.length) {
    return [{ text: story }];
  }

  const pattern = sorted.map((w) => escapeRegExp(w.word.trim())).join('|');
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');

  const segments: StorySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(story)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: story.slice(lastIndex, match.index) });
    }

    const matchedText = match[0];
    const matchedWord = sorted.find(
      (w) => w.word.trim().toLowerCase() === matchedText.toLowerCase()
    );

    segments.push({
      text: matchedText,
      highlight: matchedWord,
    });

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < story.length) {
    segments.push({ text: story.slice(lastIndex) });
  }

  return segments;
}
