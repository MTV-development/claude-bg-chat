import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme-aware background colors
        'theme-bg': {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
          hover: 'var(--color-bg-hover)',
        },
        // Theme-aware text colors
        'theme-text': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
        // Theme-aware border colors
        'theme-border': {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
        },
        // Theme-aware accent colors
        'theme-accent': {
          primary: 'var(--color-accent-primary)',
          'primary-hover': 'var(--color-accent-primary-hover)',
          secondary: 'var(--color-accent-secondary)',
        },
        // Theme-aware semantic colors
        'theme-success': {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
        },
        'theme-warning': {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
        },
        'theme-error': {
          DEFAULT: 'var(--color-error)',
          bg: 'var(--color-error-bg)',
        },
        'theme-info': {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-info-bg)',
        },
      },
      boxShadow: {
        'theme': '0 1px 3px var(--color-shadow)',
        'theme-md': '0 4px 6px var(--color-shadow)',
        'theme-lg': '0 10px 15px var(--color-shadow-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config;
