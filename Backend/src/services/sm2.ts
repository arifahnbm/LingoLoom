import { ReviewRating } from '../types/models';

export interface SM2CardState {
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
}

export interface SM2CalculationResult {
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
  next_review_date: string;
  label_id: string;
}

const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.5;

export function formatIntervalIndonesian(days: number, isMinutes = false): string {
  if (isMinutes) {
    return '10 mnt';
  }
  if (days <= 1) {
    return '1 hari';
  }
  if (days < 14) {
    return `${days} hari`;
  }
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} mgg`;
  }
  const months = Math.round(days / 30);
  return `${months} bln`;
}

/**
 * Algoritma SM-2 Spaced Repetition untuk 4 tombol evaluasi LingoLoom:
 * - again (Lupa): reset repetisi, tambah lapses, ulang dalam 10 menit
 * - hard  (Susah): sedikit perkecil ease_factor, perpanjang interval lebih konservatif
 * - good  (Ingat): progres standar SM-2 (1 hari -> 6 hari -> interval * ease_factor)
 * - easy  (Mudah): naikkan ease_factor + bonus multiplier 1.3x
 */
export function calculateSM2(
  state: SM2CardState,
  rating: ReviewRating,
  now: Date = new Date()
): SM2CalculationResult {
  const currentInterval = Math.max(0, state.interval_days || 0);
  const currentEase = Math.max(MIN_EASE_FACTOR, state.ease_factor || 2.5);
  const currentReps = Math.max(0, state.repetitions || 0);
  const currentLapses = Math.max(0, state.lapses || 0);

  let nextIntervalDays = 1;
  let nextEase = currentEase;
  let nextReps = currentReps;
  let nextLapses = currentLapses;
  let nextReviewDate = new Date(now.getTime());
  let labelId = '1 hari';

  switch (rating) {
    case 'again': {
      nextReps = 0;
      nextLapses = currentLapses + 1;
      nextIntervalDays = 0;
      nextEase = Math.max(MIN_EASE_FACTOR, Number((currentEase - 0.2).toFixed(2)));
      // Muncul lagi dalam 10 menit
      nextReviewDate = new Date(now.getTime() + 10 * 60 * 1000);
      labelId = formatIntervalIndonesian(0, true);
      break;
    }
    case 'hard': {
      nextReps = currentReps === 0 ? 1 : currentReps;
      nextIntervalDays =
        currentReps === 0
          ? 1
          : Math.max(1, Math.round(Math.max(1, currentInterval) * 1.2));
      nextEase = Math.max(MIN_EASE_FACTOR, Number((currentEase - 0.15).toFixed(2)));
      nextReviewDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);
      labelId = formatIntervalIndonesian(nextIntervalDays);
      break;
    }
    case 'good': {
      nextReps = currentReps + 1;
      if (currentReps === 0) {
        nextIntervalDays = 1;
      } else if (currentReps === 1) {
        nextIntervalDays = 6;
      } else {
        nextIntervalDays = Math.max(1, Math.round(currentInterval * currentEase));
      }
      nextEase = Number(currentEase.toFixed(2));
      nextReviewDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);
      labelId = formatIntervalIndonesian(nextIntervalDays);
      break;
    }
    case 'easy': {
      nextReps = currentReps + 1;
      if (currentReps === 0) {
        nextIntervalDays = 4;
      } else if (currentReps === 1) {
        nextIntervalDays = 10;
      } else {
        nextIntervalDays = Math.max(2, Math.round(currentInterval * currentEase * 1.3));
      }
      nextEase = Math.min(MAX_EASE_FACTOR, Number((currentEase + 0.15).toFixed(2)));
      nextReviewDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);
      labelId = formatIntervalIndonesian(nextIntervalDays);
      break;
    }
  }

  return {
    interval_days: nextIntervalDays,
    ease_factor: nextEase,
    repetitions: nextReps,
    lapses: nextLapses,
    next_review_date: nextReviewDate.toISOString(),
    label_id: labelId,
  };
}

export function previewSM2Intervals(state: SM2CardState): Record<ReviewRating, string> {
  return {
    again: calculateSM2(state, 'again').label_id,
    hard: calculateSM2(state, 'hard').label_id,
    good: calculateSM2(state, 'good').label_id,
    easy: calculateSM2(state, 'easy').label_id,
  };
}
