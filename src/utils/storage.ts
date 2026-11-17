import { DEFAULT_FIREBASE_URL, STORAGE_KEYS } from '../data/seedData';

export function loadStoredArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch (err) {
    console.warn('Gagal membaca LocalStorage:', err);
  }
  const seeded = JSON.parse(JSON.stringify(fallback)) as T[];
  saveStoredValue(key, seeded);
  return seeded;
}

export function saveStoredValue(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Gagal menyimpan ke LocalStorage:', err);
  }
}

export function getActiveFirebaseUrl(): string {
  const stored = (localStorage.getItem(STORAGE_KEYS.FIREBASE_URL) || '').trim();
  const winDefault =
    typeof window !== 'undefined' &&
    (window as unknown as { __CAT_DEFAULT_FIREBASE_URL__?: string }).__CAT_DEFAULT_FIREBASE_URL__;
  const raw = stored || (winDefault || DEFAULT_FIREBASE_URL || '').trim();
  return raw.replace(/\/+$/, '');
}

export function setStoredFirebaseUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean) {
    localStorage.removeItem(STORAGE_KEYS.FIREBASE_URL);
  } else {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_URL, clean);
  }
}
