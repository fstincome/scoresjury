import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, ClipboardList, Lock, Medal, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildRanking } from "@/lib/scoring";
import { useCompetition, useCompetitions } from "@/lib/useCompetition";
import { InstallButton } from "@/components/InstallButton";
import { OfflineBadge } from "@/components/OfflineBadge";
import { PreloadOfflineButton } from "@/components/PreloadOfflineButton";
import { Toaster } from "@/components/ui/sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Classement Live — Compétitions & jury" },
      {
        name: "description",
        content:
          "Classement combiné en temps réel des équipes, calculé à partir des notes de tous les jurés.",
      },
      { property: "og:title", content: "Classement Live — Compétitions & jury" },
      {
        property: "og:description",
        content: "Suivez le classement des équipes en direct, compétition par compétition.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { competitions } = useCompetitions();
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!selected && competitions[0]) setSelected(competitions[0].id);
  }, [competitions, selected]);

  const { competition, criteria, teams, juries, scores } = useCompetition(selected);
  const locked = !!competition?.locked;

  const ranking = buildRanking(teams, criteria, scores)
    .filter((r) => r.submitted > 0)
    .sort((a, b) => b.avg - a.avg);

  const podiumIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-6 w-6 text-[color:var(--gold)]" />;
    if (i === 1) return <Medal className="h-6 w-6 text-[color:var(--silver)]" />;
    if (i === 2) return <Award className="h-6 w-6 text-[color:var(--bronze)]" />;
    return <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-br from-primary to-[color:var(--primary-glow)] text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80">
              {competition?.name ?? "Compétition"}
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              {locked ? "🏆 Résultats Proclamés" : "Classement Live"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {locked
                ? "Session clôturée — résultats officiels."
                : "Mise à jour en temps réel selon les notes du jury."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OfflineBadge />
            <InstallButton />
            <Link to="/login">
              <Button variant="secondary" size="lg">
                <ClipboardList className="mr-2 h-4 w-4" /> Espace jury / admin
              </Button>
            </Link>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {competitions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {competitions.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selected === c.id ? "default" : "outline"}
                onClick={() => setSelected(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {locked && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <Lock className="h-4 w-4" />
            Compétition clôturée — les notes ne sont plus modifiables.
          </div>
        )}

        <Card className="p-0">
          <div className="border-b px-5 py-3">
            <h2 className="text-lg font-semibold">Classement</h2>
            <p className="text-xs text-muted-foreground">
              Moyenne des totaux des jurés · {teams.length} équipe
              {teams.length > 1 ? "s" : ""} · {juries.length} juré
              {juries.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y">
            {ranking.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Aucune note encore enregistrée.
              </div>
            )}
            {ranking.map((r, i) => (
              <div
                key={r.team.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i === 0
                    ? "bg-gradient-to-r from-[color:var(--gold)]/15 to-transparent"
                    : i === 1
                      ? "bg-gradient-to-r from-[color:var(--silver)]/10 to-transparent"
                      : i === 2
                        ? "bg-gradient-to-r from-[color:var(--bronze)]/10 to-transparent"
                        : ""
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center">{podiumIcon(i)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-semibold">{r.team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Équipe n°{r.team.project_number} · {r.submitted}/{juries.length} juré
                    {r.submitted > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums">{r.avg.toFixed(1)}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">/ {r.max}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}
