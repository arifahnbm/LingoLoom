import {
  AutoFillContext,
  ExampleSentence,
  HighlightedWord,
  StoryLevel,
} from '../types/models';

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:5000').replace(/\/$/, '');
const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET?.trim();

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
  return headers;
}

export async function requestAIAutoFill(
  word: string,
  context: AutoFillContext = 'daily'
): Promise<AIAutoFillPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/auto-fill`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ word, context }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI Service error (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as AIAutoFillPayload;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestAIMicroStory(
  words: Array<{ word: string; meaning_id: string }>,
  level: StoryLevel = 'intermediate'
): Promise<AIMicroStoryPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai/micro-story`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ words, level }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI Service error (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as AIMicroStoryPayload;
  } finally {
    clearTimeout(timeout);
  }
}
