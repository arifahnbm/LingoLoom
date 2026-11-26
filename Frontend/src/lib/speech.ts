'use client';

import { SpeechAccent } from '@/types/lingoloom';

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function selectEnglishVoice(accent: SpeechAccent): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const exactMatch = voices.find(
    (v) => v.lang.toLowerCase() === accent.toLowerCase() && v.localService
  );
  if (exactMatch) return exactMatch;

  const langMatch = voices.find((v) => v.lang.toLowerCase() === accent.toLowerCase());
  if (langMatch) return langMatch;

  const fallbackEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  return fallbackEn || null;
}

export interface SpeakOptions {
  accent?: SpeechAccent;
  rate?: number;
  audioUrl?: string | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Memutar pelafalan bahasa Inggris:
 * - Jika `audioUrl` tersedia (misal dari Supabase Storage), memutar file audio langsung.
 * - Jika tidak, memakai Web Speech API (`window.speechSynthesis`) gratis dan instan.
 */
export function speakEnglish(text: string, options: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !text.trim()) return;

  stopSpeaking();

  const {
    accent = 'en-US',
    rate = 0.95,
    audioUrl = null,
    onStart,
    onEnd,
    onError,
  } = options;

  if (audioUrl) {
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    audio.onplay = () => onStart?.();
    audio.onended = () => {
      currentAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      currentAudio = null;
      // Fallback ke SpeechSynthesis jika file audio gagal dimuat
      speakWithSynthesis(text, accent, rate, onStart, onEnd, onError);
    };
    audio.play().catch(() => {
      speakWithSynthesis(text, accent, rate, onStart, onEnd, onError);
    });
    return;
  }

  speakWithSynthesis(text, accent, rate, onStart, onEnd, onError);
}

function speakWithSynthesis(
  text: string,
  accent: SpeechAccent,
  rate: number,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = accent;
  utterance.rate = rate;
  utterance.pitch = 1;

  const voice = selectEnglishVoice(accent);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();

  window.speechSynthesis.speak(utterance);
}
