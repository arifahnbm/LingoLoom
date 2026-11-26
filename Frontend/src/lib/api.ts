import { createClient } from '@/lib/supabase/client';
import {
  AdminStats,
  AdminTransactionsResponse,
  AdminUserItem,
  AutoFillContext,
  AutoFillResult,
  Deck,
  ExampleSentence,
  Flashcard,
  MicroStory,
  ProfileOverviewResponse,
  PublicAppConfig,
  QuotaSummary,
  ReviewRating,
  SafeAppSettings,
  StoryLevel,
  SubscriptionAction,
} from '@/types/lingoloop';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  quota?: QuotaSummary;

  constructor(message: string, status: number, code?: string, quota?: QuotaSummary) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.quota = quota;
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiError('Sesi kamu sudah berakhir. Silakan masuk kembali.', 401, 'UNAUTHORIZED');
  }
  return token;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError(
      'Tidak dapat terhubung ke server Backend LingoLoop. Pastikan Backend berjalan di port 4000.',
      0,
      'NETWORK_ERROR'
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.error || 'Terjadi kesalahan saat memproses permintaan.',
      response.status,
      data.code,
      data.quota
    );
  }

  return data as T;
}

export const lingoloopApi = {
  getPublicConfig: async (): Promise<PublicAppConfig> => {
    const response = await fetch(`${API_BASE_URL}/api/public/config`);
    if (!response.ok) {
      throw new ApiError('Gagal memuat konfigurasi publik.', response.status);
    }
    return (await response.json()) as PublicAppConfig;
  },

  getProfileOverview: () => apiRequest<ProfileOverviewResponse>('/api/profile'),

  getDecks: () => apiRequest<{ decks: Deck[] }>('/api/decks'),

  createDeck: (payload: {
    title: string;
    description?: string;
    color_theme?: string;
    icon?: string;
  }) =>
    apiRequest<{ deck: Deck }>('/api/decks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteDeck: (deckId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/decks/${deckId}`, {
      method: 'DELETE',
    }),

  getDeckCards: (deckId: string) =>
    apiRequest<{ deck: Deck; cards: Flashcard[] }>(`/api/decks/${deckId}/cards`),

  createCard: (payload: {
    deck_id: string;
    word: string;
    phonetic?: string;
    part_of_speech?: string;
    meaning_id: string;
    synonyms?: string[];
    examples?: ExampleSentence[];
    audio_url?: string | null;
  }) =>
    apiRequest<{ card: Flashcard }>('/api/cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteCard: (cardId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/cards/${cardId}`, {
      method: 'DELETE',
    }),

  getDailyStudyQueue: () =>
    apiRequest<{ title: string; mode: string; cards: Flashcard[] }>('/api/study/daily'),

  getDeckStudyQueue: (deckId: string, practiceAll = false) =>
    apiRequest<{
      title: string;
      deck?: Deck;
      mode: string;
      total_in_deck?: number;
      cards: Flashcard[];
    }>(`/api/study/${deckId}${practiceAll ? '?mode=all' : ''}`),

  submitReview: (cardId: string, rating: ReviewRating) =>
    apiRequest<{
      card: Flashcard;
      streak_count: number;
      sm2: {
        interval_days: number;
        ease_factor: number;
        repetitions: number;
        lapses: number;
        next_review_date: string;
        label_id: string;
      };
    }>(`/api/study/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  autoFillVocab: (word: string, context: AutoFillContext = 'daily') =>
    apiRequest<AutoFillResult>('/api/ai/auto-fill', {
      method: 'POST',
      body: JSON.stringify({ word, context }),
    }),

  getStories: () => apiRequest<{ stories: MicroStory[]; quota: QuotaSummary }>('/api/stories'),

  generateStory: (level: StoryLevel = 'intermediate') =>
    apiRequest<{ story: MicroStory; source: string; quota: QuotaSummary }>(
      '/api/stories/generate',
      {
        method: 'POST',
        body: JSON.stringify({ level }),
      }
    ),

  deleteStory: (storyId: string) =>
    apiRequest<{ deleted: boolean }>(`/api/stories/${storyId}`, {
      method: 'DELETE',
    }),

  // =========================================================================
  // Super Admin APIs (/api/admin/*)
  // =========================================================================
  getAdminStats: () => apiRequest<AdminStats>('/api/admin/stats'),

  getAdminUsers: (search = '', plan = 'all') => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (plan && plan !== 'all') params.set('plan', plan);
    const qs = params.toString();
    return apiRequest<{ users: AdminUserItem[] }>(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },

  updateUserSubscription: (
    userId: string,
    payload: {
      action: SubscriptionAction;
      amount_idr?: number;
      notes?: string;
    }
  ) =>
    apiRequest<{ user: AdminUserItem; transaction: unknown }>(
      `/api/admin/users/${userId}/subscription`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getAdminTransactions: () => apiRequest<AdminTransactionsResponse>('/api/admin/transactions'),

  getAdminSettings: () => apiRequest<{ settings: SafeAppSettings }>('/api/admin/settings'),

  updateAdminSettings: (payload: {
    ai_enabled?: boolean;
    ai_model?: string;
    new_gemini_api_key?: string;
    clear_custom_api_key?: boolean;
    free_autofill_daily_limit?: number;
    free_story_weekly_limit?: number;
    pro_autofill_daily_fup?: number;
    pro_story_daily_fup?: number;
    whatsapp_admin_number?: string;
    pro_price_idr?: number;
  }) =>
    apiRequest<{ settings: SafeAppSettings }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
