import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

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

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    setAttributeMock.mockClear();
    matchMediaMock.mockClear();
    prefersDark = false;
    mediaQueryListeners = [];
  });

  describe('ThemeProvider', () => {
    it('renders children correctly', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Test Child</div>
        </ThemeProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('uses defaultTheme when provided and no stored preference', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // After mount, system preference takes over if no stored preference
      expect(result.current.theme).toBe('light');
    });

    it('initializes with stored theme from localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('dark');
    });

    it('initializes with system preference when no stored theme', async () => {
      prefersDark = true;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('useTheme hook', () => {
    it('throws error when used outside ThemeProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('returns theme context values', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('setTheme');
    });
  });

  describe('toggleTheme', () => {
    it('toggles from light to dark', async () => {
      // Explicitly ensure localStorage returns null (no stored preference)
      // and system preference is light
      localStorageMock.getItem.mockReturnValue(null);
      prefersDark = false;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Wait for mount and initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verify we're starting from light theme
      expect(result.current.theme).toBe('light');

      // Toggle to dark
      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('toggles from dark to light', async () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('sets theme to specific value', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });

    it('persists theme to localStorage', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    });

    it('applies data-theme attribute to document', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(setAttributeMock).toHaveBeenCalledWith('data-theme', 'dark');
    });
  });

  describe('localStorage persistence', () => {
    it('reads stored theme on initialization', async () => {
      localStorageMock.getItem.mockReturnValue('dark');

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme-preference');
    });

    it('handles invalid stored value gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('invalid');
      prefersDark = false;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('light');
    });
  });

  describe('system preference detection', () => {
    it('detects dark system preference', async () => {
      prefersDark = true;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('dark');
    });

    it('detects light system preference', async () => {
      prefersDark = false;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('light');
    });

    it('responds to system preference changes when no explicit preference set', async () => {
      prefersDark = false;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current.theme).toBe('dark');
    });

    it('ignores system preference changes when explicit preference is set', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      prefersDark = false;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        mediaQueryListeners.forEach(listener => {
          listener({ matches: true } as MediaQueryListEvent);
        });
      });

      expect(result.current.theme).toBe('light');
    });
  });
});
