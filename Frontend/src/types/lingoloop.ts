export type UserPlan = 'free' | 'pro';
export type UserRole = 'user' | 'super_admin';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type AutoFillContext = 'daily' | 'work' | 'academic';
export type StoryLevel = 'beginner' | 'intermediate' | 'advanced';
export type SpeechAccent = 'en-US' | 'en-GB';
export type SubscriptionAction = 'pro_30d' | 'pro_365d' | 'pro_lifetime' | 'downgrade_free';
export type PlanGranted = 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | 'downgrade_free';

export interface ExampleSentence {
  en: string;
  id: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role?: UserRole;
  plan: UserPlan;
  plan_expires_at?: string | null;
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
  plan_expires_at?: string | null;
  ai_enabled?: boolean;
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
  source_sentence?: string | null;
  source_url?: string | null;
  source_type?: 'web' | 'extension';
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

export interface PublicAppConfig {
  whatsapp_admin_number: string;
  pro_price_idr: number;
  free_autofill_daily_limit: number;
  free_story_weekly_limit: number;
  ai_enabled: boolean;
}

export interface AdminStats {
  total_users: number;
  active_pro_users: number;
  revenue_month_idr: number;
  revenue_total_idr: number;
  ai_requests_today: number;
  cache_hits_today: number;
  cache_hit_rate: number;
  ai_enabled: boolean;
  ai_model: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  plan: UserPlan;
  plan_expires_at: string | null;
  streak_count: number;
  created_at: string;
  effective_plan: UserPlan;
  is_expired: boolean;
  is_lifetime: boolean;
  days_remaining: number | null;
}

export interface AdminTransactionItem {
  id: string;
  user_id: string;
  admin_id: string | null;
  plan_granted: PlanGranted;
  duration_days: number | null;
  amount_idr: number;
  payment_method: string;
  notes: string;
  created_at: string;
  user_email: string;
  user_name: string;
  admin_email: string;
}

export interface AdminTransactionsResponse {
  transactions: AdminTransactionItem[];
  summary: {
    total_revenue_idr: number;
    month_revenue_idr: number;
    total_count: number;
  };
}

export interface SafeAppSettings {
  ai_enabled: boolean;
  ai_model: string;
  has_custom_api_key: boolean;
  masked_api_key: string | null;
  free_autofill_daily_limit: number;
  free_story_weekly_limit: number;
  pro_autofill_daily_fup: number;
  pro_story_daily_fup: number;
  whatsapp_admin_number: string;
  pro_price_idr: number;
  updated_at: string;
}
