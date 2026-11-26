'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookMarked,
  Flame,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';
import { createClient } from '@/lib/supabase/client';
import { UserPlan, UserRole } from '@/types/lingoloop';

interface AppNavbarProps {
  streakCount?: number;
  plan?: UserPlan;
  role?: UserRole;
  userEmail?: string;
}

export function AppNavbar({
  streakCount = 0,
  plan = 'free',
  role = 'user',
  userEmail,
}: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSuperAdmin = role === 'super_admin';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/stories', label: 'Cerita Mikro', icon: BookMarked },
  ];

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" size="sm" />
          <nav className="hidden items-center gap-2 sm:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-extrabold transition-all ${
                    isActive
                      ? 'border-2 border-sky-200 bg-sky-50 text-[#0284C7]'
                      : 'border-2 border-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Shortcut Panel Admin — hanya tampil untuk super_admin */}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all ${
                pathname?.startsWith('/admin')
                  ? 'border-violet-400 bg-violet-600 text-white'
                  : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100'
              }`}
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Panel Admin</span>
            </Link>
          )}

          {/* Daily Streak Badge */}
          <div
            title="Daily Streak Belajar"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-600"
          >
            <Flame className="h-4 w-4 fill-[#FFC800] text-amber-500" />
            <span>{streakCount}</span>
          </div>

          {/* Plan Badge */}
          <span
            className={`hidden items-center gap-1 rounded-xl border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide sm:inline-flex ${
              plan === 'pro'
                ? 'border-violet-300 bg-violet-100 text-violet-700'
                : 'border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            {plan === 'pro' && <Sparkles className="h-3.5 w-3.5" />}
            {plan === 'pro' ? 'PRO' : 'GRATIS'}
          </span>

          {userEmail && (
            <span className="hidden max-w-[140px] truncate text-xs font-bold text-slate-500 md:inline">
              {userEmail}
            </span>
          )}

          <button
            onClick={handleLogout}
            title="Keluar"
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 py-1.5 text-sm font-extrabold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom-style Subnav inside header */}
      <div className="flex border-t border-slate-100 bg-white px-4 py-2 sm:hidden">
        <div
          className={`grid w-full gap-2 ${isSuperAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold ${
                  isActive
                    ? 'border-2 border-sky-200 bg-sky-50 text-[#0284C7]'
                    : 'border-2 border-slate-100 bg-slate-50 text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {isSuperAdmin && (
            <Link
              href="/admin"
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold ${
                pathname?.startsWith('/admin')
                  ? 'border-2 border-violet-300 bg-violet-100 text-violet-700'
                  : 'border-2 border-violet-100 bg-violet-50/70 text-violet-700'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
