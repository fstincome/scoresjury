// Cache local (localStorage) des données lues depuis la base, pour que le
// classement et l'écran de vote restent consultables sans connexion.

const PREFIX = "juryscore_cache:";

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota dépassé : on ignore */
  }
}
