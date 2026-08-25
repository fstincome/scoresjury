// Préchargement volontaire : met en cache toutes les données nécessaires au
// classement et à l'écran de vote, ainsi que les pages elles-mêmes, pour un
// accès instantané hors connexion — même avant la connexion d'un juré.
import { supabase } from "@/integrations/supabase/client";
import { writeCache } from "@/lib/offline-cache";
import type { Competition, Criterion, Jury, Score, Team } from "@/lib/scoring";

const ROUTES = ["/", "/login", "/vote"];
const PRELOAD_FLAG = "preloaded_at";

export function readPreloadedAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("juryscore_cache:" + PRELOAD_FLAG);
  const n = raw ? Number(JSON.parse(raw)) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function warmRoutes() {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open("juryscore-pages");
    await Promise.all(
      ROUTES.map(async (r) => {
        try {
          const res = await fetch(r, { cache: "reload" });
          if (res.ok) await cache.put(r, res.clone());
        } catch {
          /* route ignorée */
        }
      }),
    );
  } catch {
    /* Cache API indisponible */
  }
}

export type PreloadResult = { competitions: number; teams: number; scores: number };

export async function preloadOfflineData(): Promise<PreloadResult> {
  const { data: comps, error } = await supabase
    .from("competitions")
    .select("id, name, locked, created_at")
    .order("created_at", { ascending: false });
  if (error || !comps) throw new Error(error?.message ?? "Chargement impossible");

  writeCache("competitions", comps);

  let teams = 0;
  let scores = 0;

  for (const c of comps as Competition[]) {
    const [crit, tms, jrs, scs] = await Promise.all([
      supabase
        .from("criteria")
        .select("id, competition_id, label, max_points, position")
        .eq("competition_id", c.id)
        .order("position"),
      supabase
        .from("teams")
        .select("id, competition_id, project_number, name")
        .eq("competition_id", c.id)
        .order("project_number"),
      supabase
        .from("juries")
        .select("id, competition_id, name, is_president")
        .eq("competition_id", c.id)
        .order("created_at"),
      supabase
        .from("scores")
        .select("id, competition_id, jury_id, team_id, criterion_id, value")
        .eq("competition_id", c.id),
    ]);
    if (crit.error || tms.error || jrs.error || scs.error) continue;

    teams += tms.data?.length ?? 0;
    scores += scs.data?.length ?? 0;

    writeCache(`competition:${c.id}`, {
      competition: c,
      criteria: (crit.data ?? []) as Criterion[],
      teams: (tms.data ?? []) as Team[],
      juries: (jrs.data ?? []) as Jury[],
      scores: (scs.data ?? []) as Score[],
    });
  }

  await warmRoutes();
  writeCache(PRELOAD_FLAG, Date.now());

  return { competitions: comps.length, teams, scores };
}
