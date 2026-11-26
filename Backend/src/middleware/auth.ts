import { Request, Response, NextFunction } from 'express';
import { isSupabaseConfigured, supabaseAdmin, supabaseAuth } from '../config/supabase';

/**
 * Memverifikasi JWT Supabase pada header `Authorization: Bearer <token>`.
 * Sekaligus memastikan baris profil tersedia di tabel `public.profiles`.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isSupabaseConfigured) {
    res.status(503).json({
      error:
        'Supabase belum dikonfigurasi di Backend/.env. Isi SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY terlebih dahulu.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Silakan masuk kembali.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Token autentikasi kosong.' });
    return;
  }

  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Sesi login tidak valid atau telah kedaluwarsa.' });
      return;
    }

    const user = data.user;
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      '';
    const avatarUrl =
      (user.user_metadata?.avatar_url as string | undefined) ||
      (user.user_metadata?.picture as string | undefined) ||
      '';

    req.user = {
      id: user.id,
      email: user.email || '',
      fullName,
      avatarUrl,
    };

    // Pastikan profil user selalu ada (berguna jika akun dibuat sebelum SQL trigger dijalankan)
    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || '',
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );

    next();
  } catch (err) {
    console.error('[requireAuth] Error verifying Supabase JWT:', err);
    res.status(500).json({ error: 'Gagal memverifikasi sesi pengguna.' });
  }
}
