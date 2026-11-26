import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        loom: {
          bg: '#FFFDF9',
          surface: '#F8FAFC',
          emerald: '#58CC02',
          emeraldDark: '#46A302',
          sky: '#1CB0F6',
          skyDark: '#0284C7',
          amber: '#FFC800',
          amberDark: '#D97706',
          violet: '#8B5CF6',
          violetDark: '#6D28D9',
          coral: '#FF4B4B',
          coralDark: '#DC2626',
          orange: '#FF9600',
          orangeDark: '#D97706',
        },
      },
    },
  },
  plugins: [],
};

export default config;
