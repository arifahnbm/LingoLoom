import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import aiRoutes from './routes/aiRoutes';

export function createApp() {
  const app = express();

  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:4000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Izinkan request server-to-server (tanpa header Origin) atau origin terdaftar
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS AI Service`));
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-ai-service-secret'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // Opsional: Validasi shared secret antara Backend dan AI Service jika diset di .env
  const serviceSecret = process.env.AI_SERVICE_SECRET?.trim();
  if (serviceSecret) {
    app.use('/api/ai', (req: Request, res: Response, next: NextFunction) => {
      if (req.header('x-ai-service-secret') !== serviceSecret) {
        res.status(401).json({ error: 'Akses AI Service ditolak' });
        return;
      }
      next();
    });
  }

  app.get('/health', (_req: Request, res: Response) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY?.trim() &&
        process.env.GEMINI_API_KEY.trim() !== 'your-gemini-api-key'
    );
    res.json({
      status: 'ok',
      service: 'lingoloop-ai',
      mode: hasGeminiKey ? 'gemini' : 'mock-fallback',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });
  });

  app.use('/api/ai', aiRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint AI tidak ditemukan' });
  });

  return app;
}

const app = createApp();
export default app;
