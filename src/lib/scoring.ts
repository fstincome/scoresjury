export type Competition = {
  id: string;
  name: string;
  locked: boolean;
  created_at: string;
};

export type Criterion = {
  id: string;
  competition_id: string;
  label: string;
  max_points: number;
  position: number;
};

export type Team = {
  id: string;
  competition_id: string;
  project_number: number;
  name: string;
};

export type Jury = {
  id: string;
  competition_id: string;
  name: string;
  is_president: boolean;
};

export type Score = {
  id: string;
  competition_id: string;
  jury_id: string;
  team_id: string;
  criterion_id: string;
  value: number;
};

export const DEFAULT_CRITERIA = [
  { label: "Innovation", max_points: 25 },
  { label: "Impact", max_points: 20 },
  { label: "Faisabilité technique", max_points: 20 },
  { label: "Qualité du prototype", max_points: 15 },
  { label: "Présentation du pitch", max_points: 10 },
  { label: "Réponses aux questions", max_points: 10 },
];

export const totalMax = (criteria: Criterion[]) =>
  criteria.reduce((s, c) => s + Number(c.max_points || 0), 0);

/** Classement agrégé : moyenne des totaux des jurés ayant noté. */
export function buildRanking(
  teams: Team[],
  criteria: Criterion[],
  scores: Score[],
) {
  const byTeam = new Map<string, Map<string, number>>();
  for (const s of scores) {
    if (!byTeam.has(s.team_id)) byTeam.set(s.team_id, new Map());
    const m = byTeam.get(s.team_id)!;
    m.set(s.jury_id, (m.get(s.jury_id) ?? 0) + Number(s.value || 0));
  }
  const rows = teams.map((t) => {
    const m = byTeam.get(t.id) ?? new Map<string, number>();
    const totals = [...m.values()];
    const submitted = totals.length;
    const avg = submitted ? totals.reduce((a, b) => a + b, 0) / submitted : 0;
    return {
      team: t,
      submitted,
      avg,
      max: totalMax(criteria),
    };
  });
  return rows;
}
