import {
  AutoFillContext,
  ExampleSentence,
  HighlightedWord,
  StoryLevel,
} from '../types/models';

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:5000').replace(/\/$/, '');
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET?.trim();
const INTERNAL_AI_SECRET = process.env.INTERNAL_AI_SECRET?.trim();

export interface AIRuntimeConfig {
  model?: string;
  apiKey?: string;
}

export interface AIAutoFillPayload {
  word: string;
  phonetic: string;
  part_of_speech: string;
  meaning_id: string;
  synonyms: string[];
  examples: ExampleSentence[];
  source?: 'gemini' | 'mock';
}

export interface AIMicroStoryPayload {
  title: string;
  story_en: string;
  story_id: string;
  highlighted_words: HighlightedWord[];
  source?: 'gemini' | 'mock';
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (AI_SERVICE_SECRET) {
    headers['x-ai-service-secret'] = AI_SERVICE_SECRET;
  }
  if (INTERNAL_AI_SECRET) {
    headers['x-internal-secret'] = INTERNAL_AI_SECRET;
  }
  return headers;
}

export async function requestAIAutoFill(
  word: string,
  context: AutoFillContext = 'daily',
  runtimeConfig?: AIRuntimeConfig
): Promise<AIAutoFillPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const payload: Record<string, unknown> = { word, context };
    if (runtimeConfig?.model) payload.model = runtimeConfig.model;
    if (runtimeConfig?.apiKey) payload.apiKey = runtimeConfig.apiKey;

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/auto-fill`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI Service returned status ${response.status}`);
    }

    return (await response.json()) as AIAutoFillPayload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestAIMicroStory(
  words: Array<{ word: string; meaning_id: string }>,
  level: StoryLevel = 'intermediate',
  runtimeConfig?: AIRuntimeConfig
): Promise<AIMicroStoryPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const payload: Record<string, unknown> = { words, level };
    if (runtimeConfig?.model) payload.model = runtimeConfig.model;
    if (runtimeConfig?.apiKey) payload.apiKey = runtimeConfig.apiKey;

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/micro-story`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI Service returned status ${response.status}`);
    }

    return (await response.json()) as AIMicroStoryPayload;
  } finally {
    clearTimeout(timeout);
  }
}
