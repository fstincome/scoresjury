import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/offline-cache";

export type PendingScore = {
  competition_id: string;
  jury_id: string;
  team_id: string;
  criterion_id: string;
  value: number;
};

const KEY = "pending_scores";

export function readPending(): PendingScore[] {
  return readCache<PendingScore[]>(KEY) ?? [];
}

export function queuePending(rows: PendingScore[]) {
  const map = new Map<string, PendingScore>();
  for (const r of [...readPending(), ...rows]) {
    map.set(`${r.jury_id}:${r.team_id}:${r.criterion_id}`, r);
  }
  writeCache(KEY, [...map.values()]);
}

export function clearPending() {
  writeCache(KEY, []);
}

/** Renvoie le nombre de notes synchronisées (0 si rien à faire ou échec). */
export async function flushPending(): Promise<number> {
  const rows = readPending();
  if (rows.length === 0) return 0;
  const { error } = await supabase
    .from("scores")
    .upsert(rows, { onConflict: "jury_id,team_id,criterion_id" });
  if (error) return 0;
  clearPending();
  return rows.length;
}
