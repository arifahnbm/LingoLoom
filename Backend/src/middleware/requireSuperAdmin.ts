import { Request, Response, NextFunction } from 'express';
import { isSupabaseConfigured, supabaseAdmin, supabaseAuth } from '../config/supabase';

/**
 * Middleware khusus Super Admin:
 * 1. Memverifikasi Bearer JWT Supabase token.
 * 2. Mengecek kolom `role === 'super_admin'` di tabel `profiles` via Service Role Client.
 */
export async function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isSupabaseConfigured) {
    res.status(503).json({
      error: 'Supabase belum dikonfigurasi di Backend/.env.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, avatar_url')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      res.status(403).json({
        error: 'Akses ditolak. Halaman ini hanya dapat diakses oleh Super Admin.',
      });
      return;
    }

    req.user = {
      id: profile.id,
      email: profile.email || data.user.email || '',
      role: 'super_admin',
      fullName: profile.full_name || '',
      avatarUrl: profile.avatar_url || '',
    };

    next();
  } catch (err) {
    console.error('[requireSuperAdmin] Error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi otorisasi Super Admin.' });
  }
}
