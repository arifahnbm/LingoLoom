import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LingoLoop — Hafal Kosa Kata Inggris Tanpa Gampang Lupa',
  description:
    'Belajar kosa kata bahasa Inggris lebih cepat dan melekat lama dengan Flashcard SRS SM-2, AI Auto-Fill 5 Detik, dan Contextual Micro-Stories.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={nunito.variable}>
      <body className="min-h-screen bg-[#FFFDF9] font-sans text-slate-800 antialiased selection:bg-emerald-200 selection:text-emerald-950">
        {children}
      </body>
    </html>
  );
}
