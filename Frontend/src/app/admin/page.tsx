'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Database,
  KeyRound,
  Power,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { AppNavbar } from '@/components/ui/AppNavbar';
import { TactileButton } from '@/components/ui/TactileButton';
import { ManageSubscriptionModal } from '@/components/admin/ManageSubscriptionModal';
import { createClient } from '@/lib/supabase/client';
import { ApiError, lingoloopApi } from '@/lib/api';
import {
  AdminStats,
  AdminTransactionItem,
  AdminUserItem,
  PlanGranted,
  ProfileOverviewResponse,
  SafeAppSettings,
} from '@/types/lingoloop';

type AdminTab = 'overview' | 'users' | 'transactions' | 'settings';
type UserPlanFilter = 'all' | 'free' | 'pro' | 'expired';

const MODEL_PRESETS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatPlanGrantedBadge(planGranted: PlanGranted): {
  label: string;
  className: string;
} {
  switch (planGranted) {
    case 'pro_monthly':
      return {
        label: 'Pro Bulanan (30h)',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'pro_yearly':
      return {
        label: 'Pro Tahunan (365h)',
        className: 'border-sky-200 bg-sky-50 text-[#0284C7]',
      };
    case 'pro_lifetime':
      return {
        label: 'Pro Lifetime',
        className: 'border-violet-200 bg-violet-50 text-violet-700',
      };
    default:
      return {
        label: 'Downgrade Gratis',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
  }
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [overview, setOverview] = useState<ProfileOverviewResponse | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 1: Overview stats
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Tab 2: Users
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<UserPlanFilter>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);

  // Tab 3: Transactions
  const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
  const [txSummary, setTxSummary] = useState({
    total_revenue_idr: 0,
    month_revenue_idr: 0,
    total_count: 0,
  });

  // Tab 4: Settings
  const [settings, setSettings] = useState<SafeAppSettings | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [newApiKey, setNewApiKey] = useState('');
  const [freeAutofillLimit, setFreeAutofillLimit] = useState(5);
  const [freeStoryLimit, setFreeStoryLimit] = useState(1);
  const [proAutofillFup, setProAutofillFup] = useState(100);
  const [proStoryFup, setProStoryFup] = useState(5);
  const [whatsappNumber, setWhatsappNumber] = useState('6281234567890');
  const [proPriceIdr, setProPriceIdr] = useState(29000);
  const [savingSettings, setSavingSettings] = useState(false);
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const syncSettingsForm = (s: SafeAppSettings) => {
    setSettings(s);
    setAiEnabled(s.ai_enabled);
    setAiModel(s.ai_model);
    setFreeAutofillLimit(s.free_autofill_daily_limit);
    setFreeStoryLimit(s.free_story_weekly_limit);
    setProAutofillFup(s.pro_autofill_daily_fup);
    setProStoryFup(s.pro_story_daily_fup);
    setWhatsappNumber(s.whatsapp_admin_number);
    setProPriceIdr(s.pro_price_idr);
  };

  const loadAllAdminData = useCallback(async () => {
    const [statsRes, usersRes, txRes, settingsRes] = await Promise.all([
      lingoloopApi.getAdminStats(),
      lingoloopApi.getAdminUsers(),
      lingoloopApi.getAdminTransactions(),
      lingoloopApi.getAdminSettings(),
    ]);

    setStats(statsRes);
    setUsers(usersRes.users);
    setTransactions(txRes.transactions);
    setTxSummary(txRes.summary);
    syncSettingsForm(settingsRes.settings);
  }, []);

  // Route Guard: cek sesi login & role === 'super_admin'
  useEffect(() => {
    let active = true;

    async function verifyAndLoad() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.replace('/login');
          return;
        }

        const profileRes = await lingoloopApi.getProfileOverview();
        if (!active) return;

        if (profileRes.profile.role !== 'super_admin') {
          router.replace('/dashboard');
          return;
        }

        setOverview(profileRes);
        await loadAllAdminData();
        if (!active) return;

        setAuthorized(true);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace('/dashboard');
          return;
        }
        showToast(
          'error',
          err instanceof Error ? err.message : 'Gagal memuat Panel Super Admin.'
        );
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    verifyAndLoad();
    return () => {
      active = false;
    };
  }, [loadAllAdminData, router, showToast]);

  const fetchFilteredUsers = useCallback(
    async (searchVal: string, filterVal: UserPlanFilter) => {
      setUsersLoading(true);
      try {
        const res = await lingoloopApi.getAdminUsers(searchVal, filterVal);
        setUsers(res.users);
      } catch (err) {
        showToast(
          'error',
          err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.'
        );
      } finally {
        setUsersLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (!authorized) return;
    const timer = setTimeout(() => {
      fetchFilteredUsers(searchQuery, planFilter);
    }, 220);
    return () => clearTimeout(timer);
  }, [authorized, fetchFilteredUsers, planFilter, searchQuery]);

  const handleToggleKillSwitch = async () => {
    const nextEnabled = !aiEnabled;
    setTogglingKillSwitch(true);
    try {
      const res = await lingoloopApi.updateAdminSettings({ ai_enabled: nextEnabled });
      syncSettingsForm(res.settings);
      setStats((prev) => (prev ? { ...prev, ai_enabled: res.settings.ai_enabled } : prev));
      showToast(
        'success',
        nextEnabled
          ? 'AI Engine berhasil DIAKTIFKAN kembali!'
          : 'AI Kill Switch AKTIF — seluruh fitur AI sementara dimatikan.'
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal mengubah status AI Kill Switch.'
      );
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await lingoloopApi.updateAdminSettings({
        ai_enabled: aiEnabled,
        ai_model: aiModel.trim(),
        new_gemini_api_key: newApiKey.trim() || undefined,
        free_autofill_daily_limit: Number(freeAutofillLimit),
        free_story_weekly_limit: Number(freeStoryLimit),
        pro_autofill_daily_fup: Number(proAutofillFup),
        pro_story_daily_fup: Number(proStoryFup),
        whatsapp_admin_number: whatsappNumber.replace(/\D/g, ''),
        pro_price_idr: Number(proPriceIdr),
      });
      syncSettingsForm(res.settings);
      setNewApiKey('');
      setStats((prev) =>
        prev
          ? {
              ...prev,
              ai_enabled: res.settings.ai_enabled,
              ai_model: res.settings.ai_model,
            }
          : prev
      );
      showToast('success', 'Pengaturan sistem & AI berhasil disimpan!');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan sistem.'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetApiKey = async () => {
    const confirmed = window.confirm(
      'Hapus custom Gemini API Key dan kembali menggunakan ENV server?'
    );
    if (!confirmed) return;

    setSavingSettings(true);
    try {
      const res = await lingoloopApi.updateAdminSettings({ clear_custom_api_key: true });
      syncSettingsForm(res.settings);
      setNewApiKey('');
      showToast('success', 'Custom API Key dihapus. AI kembali menggunakan ENV Server.');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal mereset API Key.'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubscriptionUpdated = async (message: string) => {
    showToast('success', message);
    await Promise.all([
      loadAllAdminData(),
      fetchFilteredUsers(searchQuery, planFilter),
    ]);
  };

  if (checkingAuth || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9] p-6">
        <div className="tactile-card flex flex-col items-center gap-3 px-8 py-7 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <ShieldCheck className="h-6 w-6 animate-pulse" />
          </div>
          <p className="text-base font-black text-slate-800">
            Memverifikasi akses Super Admin...
          </p>
          <p className="text-xs font-bold text-slate-400">
            Hanya akun dengan otorisasi super_admin yang dapat membuka panel ini.
          </p>
        </div>
      </div>
    );
  }

  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Ringkasan', icon: Activity },
    { id: 'users', label: 'Pengguna & Langganan', icon: Users },
    { id: 'transactions', label: 'Riwayat Transaksi WA', icon: Receipt },
    { id: 'settings', label: 'Pengaturan Sistem & AI', icon: Settings2 },
  ];

  const isAiActive = settings?.ai_enabled ?? stats?.ai_enabled ?? true;

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-16">
      <AppNavbar
        streakCount={overview?.stats.streak_count ?? 0}
        plan={overview?.profile.plan || 'free'}
        role={overview?.profile.role || 'super_admin'}
        userEmail={overview?.profile.email}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm">
          <div
            className={`flex items-start gap-2.5 rounded-2xl border-2 border-b-4 px-4 py-3.5 text-sm font-extrabold shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-rose-300 bg-rose-50 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#58CC02]" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#FF4B4B]" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-7 sm:px-6">
        {/* Super Admin Header */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Panel Kontrol Super Admin
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Pusat Kendali LingoLoop
            </h1>
            <p className="text-sm font-bold text-slate-500">
              Kelola pengguna, aktivasi Pro via WhatsApp, pantau cache AI, dan atur sistem secara real-time.
            </p>
          </div>

          <TactileButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              loadAllAdminData();
              showToast('success', 'Data Super Admin diperbarui.');
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Muat Ulang Data
          </TactileButton>
        </section>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl border-2 border-b-4 px-4 py-2.5 text-sm font-extrabold transition-all active:translate-y-0.5 active:border-b-2 ${
                  isActive
                    ? 'border-[#6D28D9] bg-[#8B5CF6] text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================================================================
            TAB 1: RINGKASAN (OVERVIEW)
           ================================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Big AI Engine Status Indicator */}
            <div
              className={`flex flex-col justify-between gap-4 rounded-2xl border-2 border-b-4 p-5 sm:flex-row sm:items-center sm:p-6 ${
                isAiActive
                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-sky-50/60'
                  : 'border-rose-300 bg-gradient-to-r from-rose-50 via-white to-amber-50/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 text-white ${
                    isAiActive
                      ? 'border-[#46A302] bg-[#58CC02]'
                      : 'border-[#DC2626] bg-[#FF4B4B]'
                  }`}
                >
                  <Power className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wider ${
                        isAiActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isAiActive ? 'animate-pulse bg-[#58CC02]' : 'bg-[#FF4B4B]'
                        }`}
                      />
                      {isAiActive ? 'AI Engine Aktif' : 'AI Dimatikan (Kill Switch)'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-extrabold text-slate-600">
                      Model: {stats?.ai_model || settings?.ai_model || 'gemini-2.5-flash'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-slate-600">
                    {isAiActive
                      ? 'Seluruh fitur AI Auto-Fill dan Contextual Micro-Stories beroperasi normal untuk pengguna.'
                      : 'Semua endpoint AI sedang membalas status 503 pemeliharaan. Pengguna tetap bisa belajar flashcard manual.'}
                  </p>
                </div>
              </div>

              <TactileButton
                type="button"
                variant={isAiActive ? 'outline' : 'primary'}
                size="sm"
                onClick={() => setActiveTab('settings')}
                className="shrink-0"
              >
                <Settings2 className="h-4 w-4" />
                Atur AI & Kill Switch
              </TactileButton>
            </div>

            {/* 4 Bright Tactile Stat Cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="tactile-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-b-4 border-[#0284C7] bg-[#1CB0F6] text-white">
                  <Users className="h-5 w-5" />
                </div>
                <p className="mt-4 text-3xl font-black text-slate-900">
                  {stats?.total_users ?? 0}
                </p>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Total Pengguna
                </p>
              </div>

              <div className="tactile-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-b-4 border-[#6D28D9] bg-[#8B5CF6] text-white">
                  <Crown className="h-5 w-5" />
                </div>
                <p className="mt-4 text-3xl font-black text-slate-900">
                  {stats?.active_pro_users ?? 0}
                </p>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Member Pro Aktif
                </p>
              </div>

              <div className="tactile-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-b-4 border-[#46A302] bg-[#58CC02] text-white">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">
                  {formatRupiah(stats?.revenue_month_idr ?? 0)}
                </p>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Pemasukan Bulan Ini
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">
                  Total semua waktu: {formatRupiah(stats?.revenue_total_idr ?? 0)}
                </p>
              </div>

              <div className="tactile-card p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border-b-4 border-[#D97706] bg-[#FFC800] text-slate-900">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="text-3xl font-black text-slate-900">
                    {stats?.ai_requests_today ?? 0}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">
                    <Database className="h-3 w-3" />
                    {stats?.cache_hit_rate ?? 0}% cache
                  </span>
                </div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Request AI Hari Ini & Hemat Cache
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: MANAJEMEN PENGGUNA & LANGGANAN
           ================================================================ */}
        {activeTab === 'users' && (
          <section className="tactile-card overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-100 bg-slate-50/70 p-5 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau email pengguna..."
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:border-[#1CB0F6] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'all', label: 'Semua' },
                    { id: 'free', label: 'Gratis' },
                    { id: 'pro', label: 'Pro Aktif' },
                    { id: 'expired', label: 'Kedaluwarsa' },
                  ] as Array<{ id: UserPlanFilter; label: string }>
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setPlanFilter(pill.id)}
                    className={`rounded-xl border-2 px-3.5 py-2 text-xs font-black transition-all ${
                      planFilter === pill.id
                        ? 'border-[#1CB0F6] bg-sky-50 text-[#0284C7]'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-white text-xs font-black uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Nama & Email</th>
                    <th className="px-5 py-3.5">Status Plan</th>
                    <th className="px-5 py-3.5">Tanggal Gabung</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center font-bold text-slate-400">
                        Memuat daftar pengguna...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center font-bold text-slate-400">
                        Tidak ada pengguna yang cocok dengan pencarian/filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-800">
                              {u.full_name || 'Tanpa Nama'}
                            </span>
                            {u.role === 'super_admin' && (
                              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-500">{u.email}</p>
                        </td>

                        <td className="px-5 py-4">
                          {u.effective_plan === 'pro' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                              <Crown className="h-3.5 w-3.5" />
                              {u.is_lifetime
                                ? 'Pro • Lifetime'
                                : `Pro • Sisa ${u.days_remaining ?? 0} hari`}
                            </span>
                          ) : u.is_expired ? (
                            <span className="inline-flex items-center rounded-full border-2 border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                              Kedaluwarsa
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border-2 border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                              Gratis
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs font-bold text-slate-500">
                          {formatDateId(u.created_at)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <TactileButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedUser(u)}
                          >
                            Kelola Plan
                          </TactileButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================================================================
            TAB 3: RIWAYAT TRANSAKSI WA
           ================================================================ */}
        {activeTab === 'transactions' && (
          <div className="space-y-5">
            {/* Revenue Summary Banner */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="tactile-card p-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  Total Pendapatan Keseluruhan
                </p>
                <p className="mt-1.5 text-2xl font-black text-[#46A302]">
                  {formatRupiah(txSummary.total_revenue_idr)}
                </p>
              </div>
              <div className="tactile-card p-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  Pendapatan Bulan Ini
                </p>
                <p className="mt-1.5 text-2xl font-black text-[#0284C7]">
                  {formatRupiah(txSummary.month_revenue_idr)}
                </p>
              </div>
              <div className="tactile-card p-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  Total Log Transaksi WA
                </p>
                <p className="mt-1.5 text-2xl font-black text-slate-800">
                  {txSummary.total_count} Transaksi
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <section className="tactile-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-100 bg-slate-50/70 text-xs font-black uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5">Tanggal</th>
                      <th className="px-5 py-3.5">Email User</th>
                      <th className="px-5 py-3.5">Paket</th>
                      <th className="px-5 py-3.5">Nominal</th>
                      <th className="px-5 py-3.5">Catatan WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {transactions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-10 text-center font-bold text-slate-400"
                        >
                          Belum ada riwayat transaksi manual WA. Aktifkan paket Pro user dari tab
                          Pengguna untuk mencatat transaksi pertama.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const badge = formatPlanGrantedBadge(tx.plan_granted);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70">
                            <td className="px-5 py-4 text-xs font-bold text-slate-500">
                              {formatDateId(tx.created_at)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="font-extrabold text-slate-800">{tx.user_email}</p>
                              {tx.user_name && (
                                <p className="text-xs font-semibold text-slate-400">
                                  {tx.user_name}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border-2 px-3 py-0.5 text-xs font-black ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-black text-slate-800">
                              {formatRupiah(tx.amount_idr)}
                            </td>
                            <td className="px-5 py-4 text-xs font-bold text-slate-500">
                              {tx.notes || tx.payment_method}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 4: PENGATURAN SISTEM & AI
           ================================================================ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* AI Kill Switch Big Card */}
            <section
              className={`rounded-2xl border-2 border-b-4 p-6 ${
                aiEnabled
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : 'border-rose-300 bg-rose-50/60'
              }`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 text-white ${
                      aiEnabled
                        ? 'border-[#46A302] bg-[#58CC02]'
                        : 'border-[#DC2626] bg-[#FF4B4B]'
                    }`}
                  >
                    <Power className="h-6 w-6" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      AI Kill Switch ({aiEnabled ? 'Aktif' : 'NONAKTIF'})
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      Matikan seluruh fitur AI Auto-Fill & Micro-Stories secara instan jika
                      terjadi lonjakan biaya API atau pemeliharaan. Flashcard manual tetap berjalan
                      100% normal.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={togglingKillSwitch}
                  onClick={handleToggleKillSwitch}
                  role="switch"
                  aria-checked={aiEnabled}
                  className={`relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 border-b-4 p-1 transition-all ${
                    aiEnabled
                      ? 'border-[#46A302] bg-[#58CC02]'
                      : 'border-[#DC2626] bg-[#FF4B4B]'
                  }`}
                >
                  <span
                    className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-sm transition-transform ${
                      aiEnabled ? 'translate-x-9' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </section>

            <form onSubmit={handleSaveSettings} className="grid gap-6 lg:grid-cols-2">
              {/* Konfigurasi Model & Custom API Key */}
              <section className="tactile-card space-y-5 p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Konfigurasi AI Gemini</h3>
                    <p className="text-xs font-bold text-slate-500">
                      API Key dienkripsi AES-256-GCM sebelum disimpan ke database.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Model Gemini Aktif
                  </label>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {MODEL_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAiModel(preset)}
                        className={`rounded-lg border-2 px-2.5 py-1 text-xs font-extrabold transition-all ${
                          aiModel === preset
                            ? 'border-violet-400 bg-violet-50 text-violet-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="gemini-2.5-flash"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-[#8B5CF6] focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Status Gemini API Key Saat Ini
                    </span>
                    {settings?.has_custom_api_key ? (
                      <span className="rounded-full border border-violet-200 bg-violet-100 px-3 py-0.5 font-mono text-xs font-black text-violet-800">
                        {settings.masked_api_key}
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800">
                        Menggunakan ENV Server
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-extrabold text-slate-600">
                      Ganti Custom Gemini API Key (opsional)
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Tempel API Key baru (kosongkan jika tidak mengubah)"
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>

                  {settings?.has_custom_api_key && (
                    <button
                      type="button"
                      onClick={handleResetApiKey}
                      disabled={savingSettings}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-rose-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Reset ke ENV Server
                    </button>
                  )}
                </div>
              </section>

              {/* Kuota, FUP, Harga Pro & WhatsApp */}
              <section className="tactile-card space-y-5 p-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-[#0284C7]">
                    <Settings2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Kuota, FUP & Harga Pro</h3>
                    <p className="text-xs font-bold text-slate-500">
                      Perubahan langsung berlaku tanpa perlu restart server.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Free Auto-Fill / Hari
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={freeAutofillLimit}
                      onChange={(e) => setFreeAutofillLimit(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#1CB0F6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Free Micro-Story / Minggu
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={freeStoryLimit}
                      onChange={(e) => setFreeStoryLimit(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#1CB0F6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Pro Auto-Fill FUP / Hari
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={proAutofillFup}
                      onChange={(e) => setProAutofillFup(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Pro Micro-Story FUP / Hari
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={proStoryFup}
                      onChange={(e) => setProStoryFup(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Harga Paket Pro (Rp / Bulan)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={proPriceIdr}
                      onChange={(e) => setProPriceIdr(Number(e.target.value))}
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#58CC02] focus:outline-none"
                    />
                    <span className="mt-1 block text-[11px] font-bold text-[#46A302]">
                      Tampilan: {formatRupiah(proPriceIdr)}
                    </span>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
                      Nomor WhatsApp Admin (628...)
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="6281234567890"
                      className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#58CC02] focus:outline-none"
                    />
                    <span className="mt-1 block text-[11px] font-bold text-slate-400">
                      Format internasional tanpa tanda + atau spasi.
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <TactileButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={savingSettings}
                  >
                    <Save className="h-5 w-5" />
                    {savingSettings ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan'}
                  </TactileButton>
                </div>
              </section>
            </form>
          </div>
        )}
      </main>

      <ManageSubscriptionModal
        user={selectedUser}
        defaultProPriceIdr={settings?.pro_price_idr || proPriceIdr || 29000}
        onClose={() => setSelectedUser(null)}
        onSuccess={handleSubscriptionUpdated}
      />
    </div>
  );
}
