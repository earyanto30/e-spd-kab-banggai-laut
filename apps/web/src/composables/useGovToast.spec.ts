import { describe, expect, it, vi } from 'vitest';
import { useGovToast } from './useGovToast';

const add = vi.fn();
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add }) }));

describe('useGovToast', () => {
  it('maps convenience methods to PrimeVue toast messages', () => {
    const toast = useGovToast();
    toast.success('Saved');
    toast.error('Failed', { summary: 'Oops', life: 1000 });
    expect(add).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success', summary: 'Berhasil', detail: 'Saved', life: 4000 }));
    expect(add).toHaveBeenNthCalledWith(2, expect.objectContaining({ severity: 'error', summary: 'Oops', detail: 'Failed', life: 1000 }));
  });
});
