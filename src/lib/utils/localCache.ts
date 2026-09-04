type CachedEntry<T> = {
  cachedAt: string;
  value: T;
};

export function getCachedValue<T>(key: string): CachedEntry<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CachedEntry<T>) : null;
  } catch {
    return null;
  }
}

export function setCachedValue<T>(key: string, value: T) {
  try {
    const entry: CachedEntry<T> = { cachedAt: new Date().toISOString(), value };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage unavailable — silently ignore, caching is a convenience only
  }
}
