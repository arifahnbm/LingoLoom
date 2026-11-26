export type AutoFillContext = 'daily' | 'work' | 'academic';
export type StoryLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExampleSentence {
  en: string;
  id: string;
}

export interface AutoFillRequest {
  word: string;
  context?: AutoFillContext;
}

export interface AutoFillResponse {
  word: string;
  phonetic: string;
  part_of_speech: string;
  meaning_id: string;
  synonyms: string[];
  examples: ExampleSentence[];
  source?: 'gemini' | 'mock';
}

export interface StoryWordInput {
  word: string;
  meaning_id: string;
}

export interface HighlightedWord {
  word: string;
  meaning_id: string;
  context_note: string;
}

export interface MicroStoryRequest {
  words: StoryWordInput[];
  level?: StoryLevel;
}

export interface MicroStoryResponse {
  title: string;
  story_en: string;
  story_id: string;
  highlighted_words: HighlightedWord[];
  source?: 'gemini' | 'mock';
}
