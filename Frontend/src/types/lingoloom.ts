export type UserPlan = 'free' | 'pro';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type AutoFillContext = 'daily' | 'work' | 'academic';
export type StoryLevel = 'beginner' | 'intermediate' | 'advanced';
export type SpeechAccent = 'en-US' | 'en-GB';

export interface ExampleSentence {
  en: string;
  id: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  plan: UserPlan;
  streak_count: number;
  last_study_date: string | null;
  ai_autofill_used_today: number;
  last_ai_reset_date: string;
}

export interface UserStats {
  streak_count: number;
  last_study_date: string | null;
  total_words: number;
  due_today: number;
  mastered_words: number;
}

export interface QuotaSummary {
  plan: UserPlan;
  is_pro: boolean;
  autofill: {
    used_today: number;
    daily_limit: number | null;
    remaining: number | null;
  };
  micro_stories: {
    used_this_week: number;
    weekly_limit: number | null;
    remaining: number | null;
  };
}

export interface ProfileOverviewResponse {
  profile: Profile;
  stats: UserStats;
  quota: QuotaSummary;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string;
  color_theme: 'emerald' | 'sky' | 'amber' | 'violet' | 'coral' | string;
  icon: string;
  is_public: boolean;
  created_at: string;
  total_cards: number;
  due_cards: number;
  mastered_cards: number;
  progress_percent: number;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id: string;
  word: string;
  phonetic: string;
  part_of_speech: string;
  meaning_id: string;
  synonyms: string[];
  examples: ExampleSentence[];
  audio_url: string | null;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  lapses: number;
  next_review_date: string;
  created_at: string;
  interval_previews?: Record<ReviewRating, string>;
}

export interface AutoFillResult {
  word: string;
  phonetic: string;
  part_of_speech: string;
  meaning_id: string;
  synonyms: string[];
  examples: ExampleSentence[];
  cached?: boolean;
  source?: 'gemini' | 'mock' | 'cache';
  quota?: QuotaSummary;
}

export interface HighlightedWord {
  word: string;
  meaning_id: string;
  context_note: string;
}

export interface MicroStory {
  id: string;
  user_id: string;
  title: string;
  story_en: string;
  story_id: string;
  target_words: HighlightedWord[];
  created_at: string;
}
