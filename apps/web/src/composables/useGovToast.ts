import { useToast } from 'primevue/usetoast';

export interface ToastOptions {
  summary?: string;
  life?: number;
  group?: string;
}

/**
 * Reusable GovToast composable wrapping PrimeVue ToastService.
 * Provides easy overlay alert triggers across all CRUD operations and views.
 */
export function useGovToast() {
  const toast = useToast();

  const parseOptions = (options?: ToastOptions | string, defaultSummary: string = 'Notifikasi', defaultLife: number = 4000) => {
    if (typeof options === 'string') {
      return { summary: options, life: defaultLife, group: undefined };
    }
    return {
      summary: options?.summary ?? defaultSummary,
      life: options?.life ?? defaultLife,
      group: options?.group,
    };
  };

  const success = (detail: string, options?: ToastOptions | string) => {
    const { summary, life, group } = parseOptions(options, 'Berhasil', 4000);
    toast.add({
      severity: 'success',
      summary,
      detail,
      life,
      group,
    });
  };

  const error = (detail: string, options?: ToastOptions | string) => {
    const { summary, life, group } = parseOptions(options, 'Terjadi Kesalahan', 5000);
    toast.add({
      severity: 'error',
      summary,
      detail,
      life,
      group,
    });
  };

  const warn = (detail: string, options?: ToastOptions | string) => {
    const { summary, life, group } = parseOptions(options, 'Peringatan', 4500);
    toast.add({
      severity: 'warn',
      summary,
      detail,
      life,
      group,
    });
  };

  const info = (detail: string, options?: ToastOptions | string) => {
    const { summary, life, group } = parseOptions(options, 'Informasi', 4000);
    toast.add({
      severity: 'info',
      summary,
      detail,
      life,
      group,
    });
  };

  return {
    toast,
    success,
    error,
    warn,
    info,
  };
}
