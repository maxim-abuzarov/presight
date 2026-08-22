import { useCallback, useState } from 'react';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';
function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStored() ?? 'dark');

  const change = useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return { theme, setTheme: change };
}
