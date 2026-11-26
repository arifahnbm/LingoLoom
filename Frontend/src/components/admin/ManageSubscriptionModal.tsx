'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Infinity as InfinityIcon, Calendar, ArrowDownCircle, X } from 'lucide-react';
import { TactileButton } from '@/components/ui/TactileButton';
import { lingoloopApi } from '@/lib/api';
import { AdminUserItem, SubscriptionAction } from '@/types/lingoloop';

interface ManageSubscriptionModalProps {
  user: AdminUserItem | null;
  defaultProPriceIdr: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

interface ActionOption {
  id: SubscriptionAction;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  activeBorder: string;
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    id: 'pro_30d',
    title: 'Pro 30 Hari',
    subtitle: 'Perpanjang / aktifkan 1 bulan',
    icon: Calendar,
    accentClass: 'bg-emerald-100 text-[#46A302]',
    activeBorder: 'border-[#58CC02] bg-emerald-50/70',
  },
  {
    id: 'pro_365d',
    title: 'Pro 1 Tahun',
    subtitle: 'Aktif selama 365 hari penuh',
    icon: Crown,
    accentClass: 'bg-sky-100 text-[#0284C7]',
    activeBorder: 'border-[#1CB0F6] bg-sky-50/70',
  },
  {
    id: 'pro_lifetime',
    title: 'Pro Lifetime',
    subtitle: 'Aktif selamanya tanpa expired',
    icon: InfinityIcon,
    accentClass: 'bg-violet-100 text-violet-700',
    activeBorder: 'border-[#8B5CF6] bg-violet-50/70',
  },
  {
    id: 'downgrade_free',
    title: 'Turunkan ke Gratis',
    subtitle: 'Cabut akses Pro & reset ke Free',
    icon: ArrowDownCircle,
    accentClass: 'bg-rose-100 text-rose-600',
    activeBorder: 'border-[#FF4B4B] bg-rose-50/70',
  },
];

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function ManageSubscriptionModal({
  user,
  defaultProPriceIdr,
  onClose,
  onSuccess,
}: ManageSubscriptionModalProps) {
  const [action, setAction] = useState<SubscriptionAction>('pro_30d');
  const [amountIdr, setAmountIdr] = useState<number>(defaultProPriceIdr || 29000);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setAction('pro_30d');
    setAmountIdr(defaultProPriceIdr || 29000);
    setNotes('');
    setError('');
  }, [user, defaultProPriceIdr]);

  if (!user) return null;

  const handleSelectAction = (nextAction: SubscriptionAction) => {
    setAction(nextAction);
    const basePrice = defaultProPriceIdr || 29000;
    if (nextAction === 'pro_30d') {
      setAmountIdr(basePrice);
    } else if (nextAction === 'pro_365d') {
      setAmountIdr(basePrice * 10);
    } else if (nextAction === 'pro_lifetime') {
      setAmountIdr(basePrice * 15);
    } else {
      setAmountIdr(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await lingoloopApi.updateUserSubscription(user.id, {
        action,
        amount_idr: action === 'downgrade_free' ? 0 : Math.max(0, Number(amountIdr) || 0),
        notes: notes.trim(),
      });

      const labels: Record<SubscriptionAction, string> = {
        pro_30d: 'Pro 30 Hari',
        pro_365d: 'Pro 1 Tahun',
        pro_lifetime: 'Pro Lifetime',
        downgrade_free: 'Paket Gratis',
      };

      onSuccess(`Langganan ${user.email} berhasil diubah ke ${labels[action]}!`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui langganan pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="tactile-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">Kelola Langganan User</h3>
            <p className="mt-0.5 text-sm font-bold text-slate-500">
              {user.full_name ? `${user.full_name} • ` : ''}
              <span className="text-slate-700">{user.email}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Plan Info */}
        <div className="mb-5 rounded-2xl border-2 border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
          Status saat ini:{' '}
          <span className="font-black text-slate-900">
            {user.effective_plan === 'pro'
              ? user.is_lifetime
                ? 'Pro Lifetime'
                : `Pro Aktif (sisa ${user.days_remaining ?? 0} hari)`
              : user.is_expired
              ? 'Pro Kedaluwarsa (kembali Gratis)'
              : 'Gratis'}
          </span>
          {user.effective_plan === 'pro' && !user.is_lifetime && (
            <span className="mt-1 block text-[11px] text-emerald-700">
              *Perpanjangan 30 hari / 1 tahun akan otomatis ditambahkan dari tanggal kedaluwarsa yang ada.
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Action Card Picker */}
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Pilih Aksi Paket
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ACTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = action === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectAction(opt.id)}
                    className={`flex items-start gap-3 rounded-2xl border-2 border-b-4 p-3.5 text-left transition-all ${
                      isSelected
                        ? opt.activeBorder
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${opt.accentClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-800">{opt.title}</p>
                      <p className="text-[11px] font-bold text-slate-500">{opt.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Nominal */}
          {action !== 'downgrade_free' && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Nominal Pembayaran (Rp)
                </label>
                <span className="text-xs font-black text-[#46A302]">
                  {formatRupiah(amountIdr)}
                </span>
              </div>
              <input
                type="number"
                min={0}
                step={1000}
                value={amountIdr}
                onChange={(e) => setAmountIdr(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-extrabold text-slate-800 focus:border-[#58CC02] focus:outline-none"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Catatan WhatsApp / Pembayaran
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Contoh: "Transfer BCA / QRIS via WA"'
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-[#1CB0F6] focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2.5 border-t-2 border-slate-100 pt-4">
            <TactileButton type="button" variant="outline" onClick={onClose}>
              Batal
            </TactileButton>
            <TactileButton
              type="submit"
              variant={action === 'downgrade_free' ? 'danger' : 'primary'}
              disabled={submitting}
            >
              {submitting ? 'Memproses...' : 'Simpan & Catat Transaksi'}
            </TactileButton>
          </div>
        </form>
      </div>
    </div>
  );
}
