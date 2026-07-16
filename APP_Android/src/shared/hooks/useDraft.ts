import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

const PREFIX = 'aintar_draft_';

export function useDraft<T>(key: string) {
  const fullKey = PREFIX + key;

  const loadDraft = useCallback(async (): Promise<T | null> => {
    try {
      const raw = await SecureStore.getItemAsync(fullKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, [fullKey]);

  const saveDraft = useCallback((state: T): void => {
    SecureStore.setItemAsync(fullKey, JSON.stringify(state)).catch(() => {});
  }, [fullKey]);

  const clearDraft = useCallback((): void => {
    SecureStore.deleteItemAsync(fullKey).catch(() => {});
  }, [fullKey]);

  return { loadDraft, saveDraft, clearDraft };
}
