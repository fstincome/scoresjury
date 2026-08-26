// Inspection et nettoyage sélectif des caches locaux (données + pages).

const PREFIX = "juryscore_cache:";

export type CacheGroupId = "ranking" | "vote" | "data";

export type CacheGroup = {
  id: CacheGroupId;
  label: string;
  description: string;
  bytes: number;
  items: number;
};

function localKeys(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) out.push(k);
  }
  return out;
}

function sizeOf(key: string): number {
  const v = localStorage.getItem(key) ?? "";
  return (key.length + v.length) * 2; // UTF-16
}

/** Regroupe les clés locales par famille fonctionnelle. */
function classify(key: string): CacheGroupId {
  const k = key.slice(PREFIX.length);
  if (k.startsWith("draft:") || k === "pending_scores") return "vote";
  if (k === "competitions" || k.startsWith("competition:")) return "data";
  return "data";
}

export function readGroups(): CacheGroup[] {
  const acc: Record<CacheGroupId, { bytes: number; items: number }> = {
    ranking: { bytes: 0, items: 0 },
    vote: { bytes: 0, items: 0 },
    data: { bytes: 0, items: 0 },
  };

  for (const key of localKeys()) {
    const g = classify(key);
    acc[g].bytes += sizeOf(key);
    acc[g].items += 1;
  }

  return [
    {
      id: "ranking",
      label: "Pages en cache (classement, vote, connexion)",
      description: "Coquille de l'application permettant l'ouverture hors connexion.",
      bytes: acc.ranking.bytes,
      items: acc.ranking.items,
    },
    {
      id: "vote",
      label: "Brouillons & notes en attente",
      description: "Saisies non encore synchronisées et brouillons de l'écran de vote.",
      bytes: acc.vote.bytes,
      items: acc.vote.items,
    },
    {
      id: "data",
      label: "Données préchargées",
      description: "Compétitions, équipes, critères, jurés et notes mis en cache.",
      bytes: acc.data.bytes,
      items: acc.data.items,
    },
  ];
}

/** Taille des pages stockées via la Cache API (service worker). */
export async function readPagesCache(): Promise<{ bytes: number; items: number }> {
  if (typeof caches === "undefined") return { bytes: 0, items: 0 };
  let bytes = 0;
  let items = 0;
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        items += 1;
        const res = await cache.match(req);
        if (!res) continue;
        const buf = await res.clone().arrayBuffer();
        bytes += buf.byteLength;
      }
    }
  } catch {
    /* Cache API indisponible */
  }
  return { bytes, items };
}

export async function clearGroup(id: CacheGroupId) {
  if (id === "ranking") {
    if (typeof caches !== "undefined") {
      for (const name of await caches.keys()) await caches.delete(name);
    }
    return;
  }
  for (const key of localKeys()) {
    if (classify(key) !== id) continue;
    if (id === "data" && key === PREFIX + "preloaded_at") continue;
    localStorage.removeItem(key);
  }
  if (id === "data") localStorage.removeItem(PREFIX + "preloaded_at");
}

export async function clearAll() {
  for (const key of localKeys()) localStorage.removeItem(key);
  if (typeof caches !== "undefined") {
    for (const name of await caches.keys()) await caches.delete(name);
  }
}

export function formatBytes(b: number): string {
  if (b <= 0) return "0 Ko";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(2)} Mo`;
}

export async function readStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}
