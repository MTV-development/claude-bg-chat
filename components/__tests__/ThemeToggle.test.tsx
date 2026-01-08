import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '@/lib/contexts';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
let prefersDark = false;
let mediaQueryListeners: Array<(e: MediaQueryListEvent) => void> = [];

const matchMediaMock = jest.fn((query: string) => ({
  matches: query.includes('dark') ? prefersDark : false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn((_event: string, listener: (e: MediaQueryListEvent) => void) => {
    mediaQueryListeners.push(listener);
  }),
  removeEventListener: jest.fn((_event: string, listener: (e: MediaQueryListEvent) => void) => {
    mediaQueryListeners = mediaQueryListeners.filter(l => l !== listener);
  }),
  dispatchEvent: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', { value: matchMediaMock });

// Mock document.documentElement.setAttribute
const setAttributeMock = jest.fn();
Object.defineProperty(document.documentElement, 'setAttribute', { value: setAttributeMock });

// Helper to render with ThemeProvider
const renderWithTheme = (ui: React.ReactElement, { storedTheme }: { storedTheme?: string } = {}) => {
  if (storedTheme) {
    localStorageMock.getItem.mockReturnValue(storedTheme);
  }
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    setAttributeMock.mockClear();
    matchMediaMock.mockClear();
    prefersDark = false;
    mediaQueryListeners = [];
  });

  describe('rendering', () => {
    it('renders a button element', () => {
      renderWithTheme(<ThemeToggle />);
      const button = screen.getByRole('switch');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('renders with custom className', () => {
      renderWithTheme(<ThemeToggle className="custom-class" />);
      const button = screen.getByRole('switch');
      expect(button.className).toContain('custom-class');
    });

    it('renders screen reader text', () => {
      renderWithTheme(<ThemeToggle />);
      expect(screen.getByText('Toggle theme')).toHaveClass('sr-only');
    });

    it('renders sun and moon icons', () => {
      renderWithTheme(<ThemeToggle />);
      const button = screen.getByRole('switch');
      // Should have 2 SVG elements (sun and moon icons)
      const svgs = button.querySelectorAll('svg');
      expect(svgs).toHaveLength(2);
    });
  });

  describe('accessibility attributes', () => {
    it('has role="switch"', () => {
      renderWithTheme(<ThemeToggle />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('has aria-checked="false" when in light mode', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'false');
    });

    it('has aria-checked="true" when in dark mode', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'true');
    });

    it('has appropriate aria-label for light mode', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    it('has appropriate aria-label for dark mode', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    it('has type="button" to prevent form submission', () => {
      renderWithTheme(<ThemeToggle />);
      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('click handling', () => {
    it('toggles theme from light to dark on click', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'false');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-checked', 'true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    });

    it('toggles theme from dark to light on click', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button).toHaveAttribute('aria-checked', 'true');

      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-checked', 'false');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'light');
    });

    it('can toggle multiple times', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');

      // Start in light mode
      expect(button).toHaveAttribute('aria-checked', 'false');

      // Toggle to dark
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-checked', 'true');

      // Toggle back to light
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-checked', 'false');

      // Toggle to dark again
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('visual state indication', () => {
    it('has different background color for light mode', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button.className).toContain('bg-theme-bg-tertiary');
      expect(button.className).not.toContain('bg-theme-accent-primary');
    });

    it('has different background color for dark mode', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      expect(button.className).toContain('bg-theme-accent-primary');
    });

    it('has toggle knob positioned left in light mode', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      const knob = button.querySelector('span[aria-hidden="true"]');
      expect(knob?.className).toContain('translate-x-0');
      expect(knob?.className).not.toContain('translate-x-5');
    });

    it('has toggle knob positioned right in dark mode', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      const knob = button.querySelector('span[aria-hidden="true"]');
      expect(knob?.className).toContain('translate-x-5');
    });

    it('shows sun icon prominently in light mode', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      const svgs = button.querySelectorAll('svg');

      // First SVG is sun icon (visible in light mode)
      expect(svgs[0].className.baseVal).toContain('opacity-100');
      // Second SVG is moon icon (hidden in light mode)
      expect(svgs[1].className.baseVal).toContain('opacity-0');
    });

    it('shows moon icon prominently in dark mode', async () => {
      localStorageMock.getItem.mockReturnValue('dark');
      renderWithTheme(<ThemeToggle />);

      // Wait for mount
      await new Promise(resolve => setTimeout(resolve, 0));

      const button = screen.getByRole('switch');
      const svgs = button.querySelectorAll('svg');

      // First SVG is sun icon (hidden in dark mode)
      expect(svgs[0].className.baseVal).toContain('opacity-0');
      // Second SVG is moon icon (visible in dark mode)
      expect(svgs[1].className.baseVal).toContain('opacity-100');
    });
  });

  describe('focus states', () => {
    it('has focus ring styling classes', () => {
      renderWithTheme(<ThemeToggle />);
      const button = screen.getByRole('switch');
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus:ring-2');
      expect(button.className).toContain('focus:ring-offset-2');
    });
  });

  describe('transition classes', () => {
    it('has transition classes for smooth animations', () => {
      renderWithTheme(<ThemeToggle />);
      const button = screen.getByRole('switch');
      expect(button.className).toContain('transition-colors');
      expect(button.className).toContain('duration-200');
    });
  });
});
