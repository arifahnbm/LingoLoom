import app from './app';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  const mode = process.env.GEMINI_API_KEY?.trim() ? 'Gemini API' : 'Mock Fallback';
  console.log(`🤖 LingoLoom AI Service berjalan di http://localhost:${PORT} [Mode: ${mode}]`);
});
