import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Competition, Criterion, Jury, Score, Team } from "@/lib/scoring";
import { readCache, writeCache } from "@/lib/offline-cache";

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>(
    () => readCache<Competition[]>("competitions") ?? [],
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("competitions")
      .select("id, name, locked, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setCompetitions(data as Competition[]);
      writeCache("competitions", data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("competitions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitions" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { competitions, loading, reload: load };
}

type Snapshot = {
  competition: Competition | null;
  criteria: Criterion[];
  teams: Team[];
  juries: Jury[];
  scores: Score[];
};

const empty: Snapshot = {
  competition: null,
  criteria: [],
  teams: [],
  juries: [],
  scores: [],
};

export function useCompetition(competitionId: string | null) {
  const [snap, setSnap] = useState<Snapshot>(() =>
    competitionId ? (readCache<Snapshot>(`competition:${competitionId}`) ?? empty) : empty,
  );

  const load = useCallback(async () => {
    if (!competitionId) {
      setSnap(empty);
      return;
    }
    // Affiche immédiatement le dernier état connu (utile hors connexion).
    const cached = readCache<Snapshot>(`competition:${competitionId}`);
    if (cached) setSnap(cached);

    const [comp, crit, tms, jrs, scs] = await Promise.all([
      supabase
        .from("competitions")
        .select("id, name, locked, created_at")
        .eq("id", competitionId)
        .maybeSingle(),
      supabase
        .from("criteria")
        .select("id, competition_id, label, max_points, position")
        .eq("competition_id", competitionId)
        .order("position"),
      supabase
        .from("teams")
        .select("id, competition_id, project_number, name")
        .eq("competition_id", competitionId)
        .order("project_number"),
      supabase
        .from("juries")
        .select("id, competition_id, name, is_president")
        .eq("competition_id", competitionId)
        .order("created_at"),
      supabase
        .from("scores")
        .select("id, competition_id, jury_id, team_id, criterion_id, value")
        .eq("competition_id", competitionId),
    ]);

    // Réseau indisponible : on garde le cache déjà affiché.
    if (comp.error || crit.error || tms.error || jrs.error || scs.error) return;

    const next: Snapshot = {
      competition: (comp.data ?? null) as Competition | null,
      criteria: (crit.data ?? []) as Criterion[],
      teams: (tms.data ?? []) as Team[],
      juries: (jrs.data ?? []) as Jury[],
      scores: (scs.data ?? []) as Score[],
    };
    setSnap(next);
    writeCache(`competition:${competitionId}`, next);
  }, [competitionId]);

  useEffect(() => {
    load();
    if (!competitionId) return;
    const ch = supabase.channel(`competition-${competitionId}`);
    for (const table of ["competitions", "criteria", "teams", "juries", "scores"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, load);
    }
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [competitionId, load]);

  return { ...snap, reload: load };
}
