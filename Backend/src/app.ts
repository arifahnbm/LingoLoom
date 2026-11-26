import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { isSupabaseConfigured } from './config/supabase';
import { requireAuth } from './middleware/auth';
import { requireSuperAdmin } from './middleware/requireSuperAdmin';
import profileRoutes from './routes/profileRoutes';
import deckRoutes from './routes/deckRoutes';
import cardRoutes from './routes/cardRoutes';
import studyRoutes from './routes/studyRoutes';
import aiProxyRoutes from './routes/aiProxyRoutes';
import storyRoutes from './routes/storyRoutes';
import publicRoutes from './routes/publicRoutes';
import adminRoutes from './routes/adminRoutes';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS Backend`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'lingoloop-backend',
      supabase_configured: isSupabaseConfigured,
      ai_service_url: process.env.AI_SERVICE_URL || 'http://localhost:5000',
    });
  });

  // Endpoint publik ringan (konfigurasi harga & WA tanpa data sensitif)
  app.use('/api/public', publicRoutes);

  // Semua endpoint privat wajib melewati verifikasi JWT Supabase
  app.use('/api/profile', requireAuth, profileRoutes);
  app.use('/api/decks', requireAuth, deckRoutes);
  app.use('/api/cards', requireAuth, cardRoutes);
  app.use('/api/study', requireAuth, studyRoutes);
  app.use('/api/ai', requireAuth, aiProxyRoutes);
  app.use('/api/stories', requireAuth, storyRoutes);

  // Semua endpoint Super Admin wajib melewati verifikasi JWT + role === 'super_admin'
  app.use('/api/admin', requireSuperAdmin, adminRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint Backend tidak ditemukan.' });
  });

  return app;
}

const app = createApp();
export default app;
