'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Lock, Mail, Sparkles, User } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { TactileButton } from '@/components/ui/TactileButton';
import { createClient, isSupabaseClientConfigured } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (password.length < 6) {
      setError('Kata sandi minimal terdiri dari 6 karakter.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setInfoMsg(
          'Akun berhasil dibuat! Cek inbox emailmu untuk konfirmasi, lalu masuk ke LingoLoom.'
        );
      }
    } catch {
      setError('Gagal mendaftarkan akun. Periksa koneksi Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Gagal memulai pendaftaran dengan Google.');
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
            Mulai Petualangan Kosa Katamu!
          </h1>
          <p className="mt-1.5 text-sm font-bold text-slate-500">
            Gratis selamanya untuk flashcard tak terbatas + SRS SM-2.
          </p>
        </div>

        {!isSupabaseClientConfigured && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border-2 border-amber-200 bg-amber-50 p-3.5 text-xs font-bold text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>Frontend/.env.local</code>{' '}
              untuk mengaktifkan pendaftaran.
            </span>
          </div>
        )}

        <div className="mt-6">
          <TactileButton
            type="button"
            variant="outline"
            fullWidth
            onClick={handleGoogleRegister}
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
            {googleLoading ? 'Mengarahkan ke Google...' : 'Daftar dengan Google'}
          </TactileButton>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-0.5 flex-1 bg-slate-100" />
          <span className="text-xs font-extrabold uppercase text-slate-400">atau email</span>
          <div className="h-0.5 flex-1 bg-slate-100" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Misal: Nadia Pratama"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#58CC02] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

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
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#58CC02] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Kata Sandi (min. 6 karakter)
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Buat kata sandi yang aman"
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#58CC02] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <TactileButton type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            <Sparkles className="h-5 w-5" />
            {loading ? 'Membuat Akun...' : 'Buat Akun Gratis'}
          </TactileButton>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-slate-500">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-black text-[#1CB0F6] hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
