'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Flame,
  GraduationCap,
  Heart,
  Plane,
  Sparkles,
  X,
} from 'lucide-react';
import { TactileButton } from '@/components/ui/TactileButton';
import { lingoloopApi } from '@/lib/api';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const COLOR_THEMES = [
  { id: 'emerald', label: 'Hijau', swatch: 'bg-[#58CC02] border-[#46A302]' },
  { id: 'sky', label: 'Biru', swatch: 'bg-[#1CB0F6] border-[#0284C7]' },
  { id: 'amber', label: 'Kuning', swatch: 'bg-[#FFC800] border-[#D97706]' },
  { id: 'violet', label: 'Ungu', swatch: 'bg-[#8B5CF6] border-[#6D28D9]' },
  { id: 'coral', label: 'Koral', swatch: 'bg-[#FF4B4B] border-[#DC2626]' },
];

const ICON_OPTIONS = [
  { id: 'book-open', label: 'Umum', Icon: BookOpen },
  { id: 'sparkles', label: 'Harian', Icon: Sparkles },
  { id: 'briefcase', label: 'Kerja', Icon: Briefcase },
  { id: 'graduation-cap', label: 'Akademik', Icon: GraduationCap },
  { id: 'plane', label: 'Travel', Icon: Plane },
  { id: 'flame', label: 'Favorit', Icon: Flame },
  { id: 'heart', label: 'Hobi', Icon: Heart },
];

export function CreateDeckModal({ isOpen, onClose, onCreated }: CreateDeckModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [icon, setIcon] = useState('book-open');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul deck wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await lingoloopApi.createDeck({
        title: title.trim(),
        description: description.trim(),
        color_theme: colorTheme,
        icon,
      });
      setTitle('');
      setDescription('');
      setColorTheme('emerald');
      setIcon('book-open');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat deck.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="tactile-card w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Buat Deck Baru</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Nama Deck *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Misal: Kosa Kata IELTS / Interview Kerja"
              className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:border-[#58CC02] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Deskripsi Singkat
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan singkat isi kosa kata di deck ini..."
              className="w-full rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:border-[#58CC02] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Warna Tema
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_THEMES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorTheme(c.id)}
                  title={c.label}
                  className={`h-9 w-9 rounded-xl border-b-4 transition-transform ${c.swatch} ${
                    colorTheme === c.id
                      ? 'scale-110 ring-2 ring-slate-800 ring-offset-2'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
              Ikon Kategori
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcon(id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-xs font-extrabold transition-all ${
                    icon === id
                      ? 'border-[#1CB0F6] bg-sky-50 text-[#0284C7]'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <TactileButton type="button" variant="outline" onClick={onClose}>
              Batal
            </TactileButton>
            <TactileButton type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Buat Deck'}
            </TactileButton>
          </div>
        </form>
      </div>
    </div>
  );
}
