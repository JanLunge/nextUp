import { computed, type ComputedRef } from 'vue';
import { useStorage, type RemovableRef } from '@vueuse/core';

const STORAGE_KEY = 'presentation-queue-passphrase';

export interface UsePassphraseReturn {
  passphrase: RemovableRef<string | null>;
  hasPassphrase: ComputedRef<boolean>;
  setPassphrase: (value: string) => void;
  clearPassphrase: () => void;
}

export function usePassphrase(): UsePassphraseReturn {
  const passphrase = useStorage<string | null>(STORAGE_KEY, null);

  const hasPassphrase = computed(() => !!passphrase.value);

  function setPassphrase(value: string): void {
    passphrase.value = value;
  }

  function clearPassphrase(): void {
    passphrase.value = null;
  }

  return {
    passphrase,
    hasPassphrase,
    setPassphrase,
    clearPassphrase,
  };
}
