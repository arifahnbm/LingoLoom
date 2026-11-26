import { Router, Request, Response } from 'express';
import { getAppSettings } from '../utils/planGuard';
import { PublicAppConfig } from '../types/models';

const router = Router();

/**
 * GET /api/public/config
 * Endpoint publik ringan untuk halaman Pricing & CTA WhatsApp di Frontend.
 * Tidak pernah mengekspos API key atau data sensitif.
 */
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const settings = await getAppSettings();
    const config: PublicAppConfig = {
      whatsapp_admin_number: settings.whatsapp_admin_number,
      pro_price_idr: settings.pro_price_idr,
      free_autofill_daily_limit: settings.free_autofill_daily_limit,
      free_story_weekly_limit: settings.free_story_weekly_limit,
      ai_enabled: settings.ai_enabled,
    };
    res.json(config);
  } catch (error) {
    console.error('[GET /api/public/config] Error:', error);
    res.status(500).json({ error: 'Gagal memuat konfigurasi publik.' });
  }
});

export default router;
