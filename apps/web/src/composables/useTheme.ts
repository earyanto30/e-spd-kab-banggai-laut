import { ref } from 'vue';

const isDark = ref<boolean>(false);

export function useTheme() {
  const initTheme = () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
    } else {
      setDark(false);
    }
  };

  const setDark = (dark: boolean) => {
    isDark.value = dark;
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const toggleTheme = () => {
    setDark(!isDark.value);
  };

  return {
    isDark,
    initTheme,
    toggleTheme,
  };
}
