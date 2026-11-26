import app from './app';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`🚀 LingoLoop Backend API berjalan di http://localhost:${PORT}`);
});
