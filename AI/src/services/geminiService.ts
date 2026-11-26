import { GoogleGenAI, Type } from '@google/genai';
import {
  AutoFillContext,
  AutoFillResponse,
  MicroStoryResponse,
  StoryLevel,
  StoryWordInput,
} from '../types/ai';
import { generateMockAutoFill, generateMockMicroStory } from './mockService';

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateAutoFill(
  word: string,
  context: AutoFillContext = 'daily'
): Promise<AutoFillResponse> {
  const cleanedWord = word.trim();
  const client = getGeminiClient();

  if (!client) {
    return generateMockAutoFill(cleanedWord, context);
  }

  const contextLabel: Record<AutoFillContext, string> = {
    daily: 'percakapan bahasa Inggris sehari-hari (daily life)',
    work: 'dunia kerja & komunikasi profesional (workplace)',
    academic: 'konteks akademik, riset, dan tulisan ilmiah (academic)',
  };

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: `Kamu adalah guru bahasa Inggris profesional untuk pembelajar Indonesia.
Berikan informasi kosa kata yang akurat, ringkas, dan mudah dipahami untuk kata bahasa Inggris: "${cleanedWord}".
Fokus konteks contoh kalimat: ${contextLabel[context]}.

Aturan:
- "word": penulisan kata bahasa Inggris yang benar (kapital di huruf pertama).
- "phonetic": transkripsi IPA yang akurat (misal /rɪˈzɪl.jənt/).
- "part_of_speech": jenis kata dalam bahasa Inggris (noun, verb, adjective, adverb, idiom, phrasal verb).
- "meaning_id": arti bahasa Indonesia yang natural, jelas, dan langsung pada intinya.
- "synonyms": 3 sampai 4 sinonim bahasa Inggris yang relevan.
- "examples": tepat 2 contoh kalimat bahasa Inggris alami yang mengandung kata "${cleanedWord}" beserta terjemahan bahasa Indonesia yang natural.`,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            part_of_speech: { type: Type.STRING },
            meaning_id: { type: Type.STRING },
            synonyms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            examples: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  en: { type: Type.STRING },
                  id: { type: Type.STRING },
                },
                required: ['en', 'id'],
              },
            },
          },
          required: ['word', 'phonetic', 'part_of_speech', 'meaning_id', 'synonyms', 'examples'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(text) as AutoFillResponse;
    return {
      word: parsed.word || cleanedWord,
      phonetic: parsed.phonetic || '',
      part_of_speech: parsed.part_of_speech || 'word',
      meaning_id: parsed.meaning_id || '',
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples.slice(0, 3) : [],
      source: 'gemini',
    };
  } catch (error) {
    console.error('[AI Auto-Fill] Gemini error, falling back to mock:', error);
    return generateMockAutoFill(cleanedWord, context);
  }
}

export async function generateMicroStory(
  words: StoryWordInput[],
  level: StoryLevel = 'intermediate'
): Promise<MicroStoryResponse> {
  const client = getGeminiClient();

  if (!client) {
    return generateMockMicroStory(words, level);
  }

  const wordListText = words
    .map((w, idx) => `${idx + 1}. "${w.word}" (arti: ${w.meaning_id})`)
    .join('\n');

  const levelGuide: Record<StoryLevel, string> = {
    beginner: 'A2-B1 (kalimat sederhana, jelas, kosakata sehari-hari yang ramah pemula)',
    intermediate: 'B1-B2 (alur menarik, kalimat mengalir natural untuk pembelajar menengah)',
    advanced: 'C1 (kaya ekspresi idiomatis dan nuansa bahasa yang elegan namun tetap enak dibaca)',
  };

  try {
    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: `Kamu adalah penulis cerita edukatif bahasa Inggris untuk pembelajar Indonesia.
Buat satu micro-story pendek (120-180 kata) dalam bahasa Inggris yang menarik, hangat, dan mudah diingat dengan level ${levelGuide[level]}.

WAJIB masukkan SELURUH kata target berikut secara persis dan natural ke dalam "story_en":
${wordListText}

Aturan:
- "title": judul cerita singkat dalam bahasa Inggris.
- "story_en": cerita bahasa Inggris utuh (gunakan ejaan exact dari setiap kata target agar mudah di-highlight oleh antarmuka).
- "story_id": terjemahan bahasa Indonesia yang alami dan enak dibaca.
- "highlighted_words": daftar setiap kata target dengan:
  - "word": kata target persis seperti yang muncul di story_en
  - "meaning_id": arti bahasa Indonesia
  - "context_note": catatan singkat (1 kalimat bahasa Indonesia) menjelaskan nuansa penggunaan kata tersebut di dalam cerita ini.`,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            story_en: { type: Type.STRING },
            story_id: { type: Type.STRING },
            highlighted_words: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning_id: { type: Type.STRING },
                  context_note: { type: Type.STRING },
                },
                required: ['word', 'meaning_id', 'context_note'],
              },
            },
          },
          required: ['title', 'story_en', 'story_id', 'highlighted_words'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(text) as MicroStoryResponse;
    return {
      title: parsed.title || 'Contextual Micro-Story',
      story_en: parsed.story_en || '',
      story_id: parsed.story_id || '',
      highlighted_words: Array.isArray(parsed.highlighted_words) ? parsed.highlighted_words : [],
      source: 'gemini',
    };
  } catch (error) {
    console.error('[AI Micro-Story] Gemini error, falling back to mock:', error);
    return generateMockMicroStory(words, level);
  }
}
