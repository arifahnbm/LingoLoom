'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpenCheck } from 'lucide-react';

interface LogoProps {
  href?: string;
  size?: 'sm' | 'md';
}

export function Logo({ href = '/', size = 'md' }: LogoProps) {
  const iconBox =
    size === 'sm' ? 'h-9 w-9 rounded-xl' : 'h-10 w-10 rounded-xl';
  const textClass = size === 'sm' ? 'text-xl' : 'text-2xl';

  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 select-none">
      <span
        className={`${iconBox} flex items-center justify-center bg-[#58CC02] text-white border-b-4 border-[#46A302] shadow-sm transition-transform group-hover:-translate-y-0.5`}
      >
        <BookOpenCheck className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'} strokeWidth={2.5} />
      </span>
      <span className={`${textClass} font-black tracking-tight text-slate-800`}>
        Lingo<span className="text-[#58CC02]">Loom</span>
      </span>
    </Link>
  );
}
