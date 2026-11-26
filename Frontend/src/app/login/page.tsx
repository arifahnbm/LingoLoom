'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { TactileButton } from '@/components/ui/TactileButton';
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(
          authError.message === 'Invalid login credentials'
            ? 'Email atau kata sandi belum cocok. Yuk cek kembali!'
            : authError.message
        );
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Gagal terhubung ke layanan autentikasi Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Gagal memulai login Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF9] px-4 py-12">
      <div className="mb-8">
        <Logo href="/" />
      </div>

      <div className="tactile-card w-full max-w-md p-7 sm:p-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">
            Selamat Datang Kembali!
          </h1>
          <p className="mt-1.5 text-sm font-bold text-slate-500">
            Lanjutkan streak belajar kosa kata bahasa Inggrismu hari ini.
          </p>
        </div>

        {!isSupabaseClientConfigured && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border-2 border-amber-200 bg-amber-50 p-3.5 text-xs font-bold text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> belum diisi di{' '}
              <code>Frontend/.env.local</code>.
            </span>
          </div>
        )}

        <div className="mt-6">
          <TactileButton
            type="button"
            variant="outline"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.14 3.58-8.64Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.07.72-2.44 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.28a12 12 0 0 0 0 10.72l3.99-3.09Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.64l3.99 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
              />
            </svg>
            {googleLoading ? 'Mengarahkan ke Google...' : 'Masuk dengan Google'}
          </TactileButton>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-slate-100" />
          <span className="text-xs font-extrabold uppercase text-slate-400">atau email</span>
          <div className="h-0.5 flex-1 bg-slate-100" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#1CB0F6] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#1CB0F6] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <TactileButton type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
            <ArrowRight className="h-5 w-5" />
          </TactileButton>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-slate-500">
          Belum punya akun?{' '}
          <Link href="/register" className="font-black text-[#1CB0F6] hover:underline">
            Daftar Gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
