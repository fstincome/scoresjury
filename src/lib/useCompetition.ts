import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Competition, Criterion, Jury, Score, Team } from "@/lib/scoring";

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("competitions")
      .select("id, name, locked, created_at")
      .order("created_at", { ascending: false });
    setCompetitions((data ?? []) as Competition[]);
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

export function useCompetition(competitionId: string | null) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [juries, setJuries] = useState<Jury[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  const load = useCallback(async () => {
    if (!competitionId) {
      setCompetition(null);
      setCriteria([]);
      setTeams([]);
      setJuries([]);
      setScores([]);
      return;
    }
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
    setCompetition((comp.data ?? null) as Competition | null);
    setCriteria((crit.data ?? []) as Criterion[]);
    setTeams((tms.data ?? []) as Team[]);
    setJuries((jrs.data ?? []) as Jury[]);
    setScores((scs.data ?? []) as Score[]);
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

  return { competition, criteria, teams, juries, scores, reload: load };
}
