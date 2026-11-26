import {
  AutoFillContext,
  AutoFillResponse,
  HighlightedWord,
  MicroStoryResponse,
  StoryLevel,
  StoryWordInput,
} from '../types/ai';

const MOCK_DICTIONARY: Record<string, Omit<AutoFillResponse, 'source'>> = {
  serendipity: {
    word: 'Serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    part_of_speech: 'noun',
    meaning_id: 'Keberuntungan tak terduga saat menemukan sesuatu yang berharga',
    synonyms: ['fortuity', 'chance', 'good fortune'],
    examples: [
      {
        en: 'Finding that cozy bookstore on a rainy afternoon was pure serendipity.',
        id: 'Menemukan toko buku nyaman di sore hujan itu benar-benar keberuntungan tak terduga.',
      },
      {
        en: 'Many scientific breakthroughs happen through a mix of hard work and serendipity.',
        id: 'Banyak terobosan ilmiah terjadi melalui perpaduan kerja keras dan kebetulan yang beruntung.',
      },
    ],
  },
  resilient: {
    word: 'Resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    part_of_speech: 'adjective',
    meaning_id: 'Tangguh; mampu cepat pulih dari kesulitan atau tekanan',
    synonyms: ['tough', 'adaptable', 'hardy'],
    examples: [
      {
        en: 'Our team remained resilient despite the sudden deadline change.',
        id: 'Tim kami tetap tangguh meskipun ada perubahan tenggat waktu secara mendadak.',
      },
      {
        en: 'Children are often more resilient than adults expect.',
        id: 'Anak-anak sering kali lebih tangguh daripada yang diperkirakan orang dewasa.',
      },
    ],
  },
  eloquent: {
    word: 'Eloquent',
    phonetic: '/ˈel.ə.kwənt/',
    part_of_speech: 'adjective',
    meaning_id: 'Fasih, lancar, dan meyakinkan dalam berbicara atau menulis',
    synonyms: ['articulate', 'expressive', 'persuasive'],
    examples: [
      {
        en: 'She delivered an eloquent presentation that inspired the entire room.',
        id: 'Dia menyampaikan presentasi yang sangat fasih dan menginspirasi seluruh ruangan.',
      },
      {
        en: 'His eloquent letter convinced the committee to approve the grant.',
        id: 'Suratnya yang meyakinkan berhasil membuat komite menyetujui dana hibah tersebut.',
      },
    ],
  },
  meticulous: {
    word: 'Meticulous',
    phonetic: '/məˈtɪk.jə.ləs/',
    part_of_speech: 'adjective',
    meaning_id: 'Sangat teliti, cermat, dan memperhatikan detail terkecil',
    synonyms: ['thorough', 'precise', 'scrupulous'],
    examples: [
      {
        en: 'The designer was meticulous about every spacing and color detail.',
        id: 'Desainer itu sangat teliti terhadap setiap detail jarak dan warna.',
      },
      {
        en: 'Meticulous research is the foundation of a strong academic paper.',
        id: 'Penelitian yang cermat adalah fondasi dari karya ilmiah yang kuat.',
      },
    ],
  },
  ubiquitous: {
    word: 'Ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    part_of_speech: 'adjective',
    meaning_id: 'Ada di mana-mana; sangat umum ditemukan',
    synonyms: ['omnipresent', 'everywhere', 'pervasive'],
    examples: [
      {
        en: 'Coffee shops have become ubiquitous in almost every neighborhood.',
        id: 'Kedai kopi kini ada di mana-mana hampir di setiap lingkungan.',
      },
      {
        en: 'Smartphones are now ubiquitous tools for daily communication and learning.',
        id: 'Ponsel pintar kini menjadi alat yang ada di mana-mana untuk komunikasi dan belajar harian.',
      },
    ],
  },
  pragmatic: {
    word: 'Pragmatic',
    phonetic: '/præɡˈmæt.ɪk/',
    part_of_speech: 'adjective',
    meaning_id: 'Pragmatis; realistis dan fokus pada solusi yang praktis',
    synonyms: ['practical', 'realistic', 'sensible'],
    examples: [
      {
        en: 'We need a pragmatic approach to launch the product before next month.',
        id: 'Kita membutuhkan pendekatan yang praktis untuk meluncurkan produk sebelum bulan depan.',
      },
      {
        en: 'Her pragmatic advice helped us avoid unnecessary complexity.',
        id: 'Nasihatnya yang realistis membantu kami menghindari kerumitan yang tidak perlu.',
      },
    ],
  },
  ephemeral: {
    word: 'Ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    part_of_speech: 'adjective',
    meaning_id: 'Berlangsung sangat singkat; fana atau sementara',
    synonyms: ['fleeting', 'brief', 'temporary'],
    examples: [
      {
        en: 'The golden light at sunset is beautiful yet ephemeral.',
        id: 'Cahaya keemasan saat matahari terbenam itu indah namun berlangsung singkat.',
      },
      {
        en: 'Social media trends are often ephemeral and fade within days.',
        id: 'Tren media sosial sering kali hanya sementara dan memudar dalam hitungan hari.',
      },
    ],
  },
  diligent: {
    word: 'Diligent',
    phonetic: '/ˈdɪl.ɪ.dʒənt/',
    part_of_speech: 'adjective',
    meaning_id: 'Rajin, tekun, dan bersungguh-sungguh dalam bekerja atau belajar',
    synonyms: ['hardworking', 'industrious', 'dedicated'],
    examples: [
      {
        en: 'With diligent practice, your English vocabulary grows every week.',
        id: 'Dengan latihan yang tekun, kosa kata bahasa Inggrismu berkembang setiap minggu.',
      },
      {
        en: 'He is a diligent analyst who always double-checks his numbers.',
        id: 'Dia adalah analis yang tekun dan selalu memeriksa ulang datanya.',
      },
    ],
  },
};

function capitalizeWord(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

export function generateMockAutoFill(
  rawWord: string,
  context: AutoFillContext = 'daily'
): AutoFillResponse {
  const key = rawWord.trim().toLowerCase();
  const cached = MOCK_DICTIONARY[key];

  if (cached) {
    return {
      ...cached,
      source: 'mock',
    };
  }

  const displayWord = capitalizeWord(rawWord);
  const lower = key || 'word';

  const contextExamples: Record<AutoFillContext, Array<{ en: string; id: string }>> = {
    daily: [
      {
        en: `I just learned the word "${lower}" and used it in a conversation today.`,
        id: `Aku baru saja mempelajari kata "${lower}" dan menggunakannya dalam percakapan hari ini.`,
      },
      {
        en: `Knowing how to use "${lower}" naturally makes daily English feel effortless.`,
        id: `Mengetahui cara memakai "${lower}" secara alami membuat bahasa Inggris harian terasa lebih mudah.`,
      },
    ],
    work: [
      {
        en: `During the team meeting, Maya mentioned "${lower}" to clarify the project goal.`,
        id: `Saat rapat tim, Maya menyebutkan "${lower}" untuk memperjelas tujuan proyek.`,
      },
      {
        en: `Using precise terms like "${lower}" improves professional communication at work.`,
        id: `Menggunakan istilah yang tepat seperti "${lower}" meningkatkan komunikasi profesional di tempat kerja.`,
      },
    ],
    academic: [
      {
        en: `The researcher examined the concept of "${lower}" across multiple case studies.`,
        id: `Peneliti tersebut mengkaji konsep "${lower}" pada beberapa studi kasus.`,
      },
      {
        en: `In academic writing, "${lower}" often appears when explaining detailed arguments.`,
        id: `Dalam penulisan akademik, "${lower}" sering muncul saat menjelaskan argumen secara rinci.`,
      },
    ],
  };

  return {
    word: displayWord,
    phonetic: `/${lower.replace(/\s+/g, '.')}/`,
    part_of_speech: 'noun / verb',
    meaning_id: `Arti kontekstual untuk "${displayWord}" (mode pratinjau — tambahkan GEMINI_API_KEY untuk definisi AI penuh)`,
    synonyms: ['related term', 'expression', 'key phrase'],
    examples: contextExamples[context],
    source: 'mock',
  };
}

export function generateMockMicroStory(
  words: StoryWordInput[],
  level: StoryLevel = 'intermediate'
): MicroStoryResponse {
  const safeWords =
    words.length > 0
      ? words.slice(0, 7)
      : [
          { word: 'resilient', meaning_id: 'tangguh' },
          { word: 'eloquent', meaning_id: 'fasih' },
          { word: 'meticulous', meaning_id: 'sangat teliti' },
        ];

  const levelTone: Record<StoryLevel, { titlePrefix: string; openingEn: string; openingId: string }> = {
    beginner: {
      titlePrefix: 'A Bright Morning in',
      openingEn: 'On a sunny Saturday morning, Raka walked into a cozy neighborhood cafe with his notebook.',
      openingId: 'Di suatu pagi Sabtu yang cerah, Raka melangkah masuk ke sebuah kafe lingkungan yang nyaman bersama buku catatannya.',
    },
    intermediate: {
      titlePrefix: 'The Turning Point of',
      openingEn: 'Rain tapped gently against the studio window as Nadia prepared for the biggest showcase of her year.',
      openingId: 'Hujan mengetuk pelan jendela studio saat Nadia bersiap menghadapi pameran terbesarnya tahun ini.',
    },
    advanced: {
      titlePrefix: 'Beyond the Horizon:',
      openingEn: 'Beneath the amber glow of the city library, Arya reflected on how small daily habits quietly reshape a career.',
      openingId: 'Di bawah cahaya keemasan perpustakaan kota, Arya merenungkan bagaimana kebiasaan kecil sehari-hari perlahan membentuk sebuah karier.',
    },
  };

  const tone = levelTone[level];

  const sentenceTemplatesEn = [
    (w: string) => `He smiled and reminded himself to keep ${w} at the heart of the plan.`,
    (w: string) => `Everyone in the room noticed how naturally ${w} shaped the conversation.`,
    (w: string) => `Even when unexpected challenges arrived, remembering ${w} kept the momentum alive.`,
    (w: string) => `A quiet moment of reflection revealed why ${w} mattered more than perfection.`,
    (w: string) => `By late afternoon, ${w} had turned an ordinary task into a memorable breakthrough.`,
    (w: string) => `Step by step, practicing ${w} gave the whole team renewed confidence.`,
    (w: string) => `Before heading home, they celebrated how ${w} brought every piece together.`,
  ];

  const sentenceTemplatesId = [
    (w: string, m: string) => `Ia tersenyum dan mengingatkan dirinya untuk selalu menanamkan makna ${w} (${m}) dalam rencananya.`,
    (w: string, m: string) => `Semua orang di ruangan itu menyadari betapa alaminya nuansa ${w} (${m}) membentuk jalannya percakapan.`,
    (w: string, m: string) => `Bahkan saat tantangan tak terduga datang, mengingat ${w} (${m}) menjaga semangat tetap menyala.`,
    (w: string, m: string) => `Momen refleksi singkat menunjukkan mengapa ${w} (${m}) jauh lebih penting daripada sekadar kesempurnaan.`,
    (w: string, m: string) => `Menjelang sore, semangat ${w} (${m}) mengubah tugas biasa menjadi terobosan yang berkesan.`,
    (w: string, m: string) => `Selangkah demi selangkah, menerapkan ${w} (${m}) memberi seluruh tim rasa percaya diri baru.`,
    (w: string, m: string) => `Sebelum pulang, mereka merayakan bagaimana ${w} (${m}) menyatukan semua bagian dengan indah.`,
  ];

  const bodyEn = safeWords.map((item, idx) =>
    sentenceTemplatesEn[idx % sentenceTemplatesEn.length](item.word)
  );
  const bodyId = safeWords.map((item, idx) =>
    sentenceTemplatesId[idx % sentenceTemplatesId.length](item.word, item.meaning_id)
  );

  const closingEn =
    'Closing the notebook with a satisfied grin, it was clear that every new word learned was another bridge to a wider world.';
  const closingId =
    'Sambil menutup buku catatan dengan senyum puas, jelas terasa bahwa setiap kata baru yang dipelajari adalah jembatan menuju dunia yang lebih luas.';

  const highlightedWords: HighlightedWord[] = safeWords.map((item) => ({
    word: item.word,
    meaning_id: item.meaning_id,
    context_note: `Dipakai dalam cerita untuk memperkuat ingatan arti "${item.meaning_id}".`,
  }));

  return {
    title: `${tone.titlePrefix} Everyday Mastery`,
    story_en: [tone.openingEn, ...bodyEn, closingEn].join(' '),
    story_id: [tone.openingId, ...bodyId, closingId].join(' '),
    highlighted_words: highlightedWords,
    source: 'mock',
  };
}
