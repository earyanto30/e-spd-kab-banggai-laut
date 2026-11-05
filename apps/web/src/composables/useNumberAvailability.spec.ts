import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useNumberAvailability } from './useNumberAvailability';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../utils/api';

describe('useNumberAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets status to auto when isAutoMode is true', async () => {
    const preview = ref('000.1.2.3/[Otomatis]/Bag.Umum/2026');
    const isAuto = ref(true);

    const detector = useNumberAvailability({
      endpoint: '/api/surat-tugas/check-number',
      previewNomor: preview,
      isAutoMode: isAuto,
    });

    await detector.recheck();
    expect(detector.status.value).toBe('auto');
    expect(detector.isAvailable.value).toBe(true);
    expect(detector.isDuplicate.value).toBe(false);
  });

  it('sets status to idle when preview is incomplete / has placeholder', async () => {
    const preview = ref('000.1.2.3/[Nomor]/Bag.Umum/2026');
    const isAuto = ref(false);

    const detector = useNumberAvailability({
      endpoint: '/api/surat-tugas/check-number',
      previewNomor: preview,
      isAutoMode: isAuto,
    });

    await detector.recheck();
    expect(detector.status.value).toBe('idle');
  });

  it('fetches endpoint and sets available or duplicate', async () => {
    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, message: 'Nomor surat tersedia' }),
    });

    const preview = ref('000.1.2.3/001/Bag.Umum/2026');
    const isAuto = ref(false);

    const detector = useNumberAvailability({
      endpoint: '/api/surat-tugas/check-number',
      previewNomor: preview,
      isAutoMode: isAuto,
    });

    await detector.recheck();
    expect(detector.status.value).toBe('available');
    expect(detector.isAvailable.value).toBe(true);

    (apiFetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false, message: 'Nomor surat sudah digunakan' }),
    });

    preview.value = '000.1.2.3/002/Bag.Umum/2026';
    await detector.recheck();
    expect(detector.status.value).toBe('duplicate');
    expect(detector.isDuplicate.value).toBe(true);
  });
});
