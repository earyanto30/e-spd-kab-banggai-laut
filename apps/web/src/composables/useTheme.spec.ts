import { beforeEach, describe, expect, it } from 'vitest';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
  });

  it('uses system preference initially and persists toggles', () => {
    const theme = useTheme();
    theme.initTheme();
    expect(theme.isDark.value).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    theme.toggleTheme();
    expect(theme.isDark.value).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
