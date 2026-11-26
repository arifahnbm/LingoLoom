'use client';

import React from 'react';

export type TactileVariant =
  | 'primary'
  | 'secondary'
  | 'amber'
  | 'violet'
  | 'danger'
  | 'orange'
  | 'outline'
  | 'ghost';

export type TactileSize = 'sm' | 'md' | 'lg';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TactileVariant;
  size?: TactileSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<TactileVariant, string> = {
  primary:
    'bg-[#58CC02] hover:bg-[#52BF02] text-white border-b-4 border-[#46A302] active:border-b-0 active:translate-y-1',
  secondary:
    'bg-[#1CB0F6] hover:bg-[#14A3E8] text-white border-b-4 border-[#0284C7] active:border-b-0 active:translate-y-1',
  amber:
    'bg-[#FFC800] hover:bg-[#F5BF00] text-slate-900 border-b-4 border-[#D97706] active:border-b-0 active:translate-y-1',
  violet:
    'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-b-4 border-[#6D28D9] active:border-b-0 active:translate-y-1',
  danger:
    'bg-[#FF4B4B] hover:bg-[#F23D3D] text-white border-b-4 border-[#DC2626] active:border-b-0 active:translate-y-1',
  orange:
    'bg-[#FF9600] hover:bg-[#ED8B00] text-white border-b-4 border-[#D97706] active:border-b-0 active:translate-y-1',
  outline:
    'bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-0.5',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 border-b-0 active:translate-y-0',
};

const SIZE_CLASSES: Record<TactileSize, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-xl gap-1.5',
  md: 'px-5 py-2.5 text-base rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base md:text-lg rounded-2xl gap-2.5',
};

export function TactileButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: TactileButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-extrabold tracking-tight transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
