import { ref, computed, watch, type Ref } from 'vue';
import { apiFetch } from '../utils/api';
import type { AvailabilityStatus } from '../components/core/NumberAvailabilityBadge.vue';

export interface UseNumberAvailabilityOptions {
  endpoint: '/api/surat-tugas/check-number' | '/api/spd/check-number';
  previewNomor: Ref<string>;
  isAutoMode: Ref<boolean>;
  excludeId?: Ref<string | null | undefined>;
  count?: Ref<number | undefined>;
  debounceMs?: number;
}

export function useNumberAvailability(options: UseNumberAvailabilityOptions) {
  const {
    endpoint,
    previewNomor,
    isAutoMode,
    excludeId,
    count,
    debounceMs = 300,
  } = options;

  const status = ref<AvailabilityStatus>('idle');
  const message = ref<string>('');
  const conflictNomor = ref<string>('');
  let timer: ReturnType<typeof setTimeout> | null = null;

  const isAvailable = computed(() => status.value === 'available' || status.value === 'auto');
  const isDuplicate = computed(() => status.value === 'duplicate');

  const checkAvailability = async () => {
    if (isAutoMode.value) {
      status.value = 'auto';
      message.value = 'Nomor akan dibuat secara otomatis oleh sistem';
      conflictNomor.value = '';
      return;
    }

    const currentNomor = previewNomor.value?.trim() || '';

    // If it has placeholder indicators or empty sequences
    if (
      !currentNomor ||
      currentNomor.includes('[') ||
      currentNomor.includes(']') ||
      currentNomor.includes('//') ||
      currentNomor.includes('  ')
    ) {
      status.value = 'idle';
      message.value = '';
      conflictNomor.value = '';
      return;
    }

    status.value = 'checking';

    try {
      const exId = excludeId?.value || '';
      const totalCount = count?.value || 1;
      const q = new URLSearchParams({
        nomor: currentNomor,
        ...(exId ? { excludeId: exId } : {}),
        ...(totalCount > 1 ? { count: String(totalCount) } : {}),
      });

      const res = await apiFetch(`${endpoint}?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isPlaceholder) {
          status.value = 'idle';
          message.value = '';
          conflictNomor.value = '';
        } else if (data.available) {
          status.value = 'available';
          message.value = data.message || 'Nomor tersedia';
          conflictNomor.value = '';
        } else {
          status.value = 'duplicate';
          message.value = data.message || 'Nomor sudah digunakan';
          conflictNomor.value = data.conflictNomor || currentNomor;
        }
      } else {
        // Fallback on HTTP error
        status.value = 'idle';
      }
    } catch {
      status.value = 'idle';
    }
  };

  const scheduleCheck = () => {
    if (timer) clearTimeout(timer);
    if (isAutoMode.value) {
      checkAvailability();
      return;
    }
    status.value = 'checking';
    timer = setTimeout(() => {
      checkAvailability();
    }, debounceMs);
  };

  watch(
    [
      () => previewNomor.value,
      () => isAutoMode.value,
      () => excludeId?.value,
      () => count?.value,
    ],
    () => {
      scheduleCheck();
    },
    { immediate: true }
  );

  return {
    status,
    message,
    conflictNomor,
    isAvailable,
    isDuplicate,
    recheck: checkAvailability,
  };
}
