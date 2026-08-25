import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Lock,
  LogOut,
  Megaphone,
  Plus,
  SlidersHorizontal,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_CRITERIA, totalMax } from "@/lib/scoring";
import { useCompetition } from "@/lib/useCompetition";
import { listJuryCodes, setJuryCode } from "@/lib/access";
import {
  clearSession,
  readSession,
  updateSession,
  type AppSession,
} from "@/lib/session";

export const Route = createFileRoute("/president")({
  head: () => ({
    meta: [
      { title: "Espace président — Pilotage de la compétition" },
      {
        name: "description",
        content:
          "Créez votre compétition, ajustez les critères et les quotas, ajoutez les équipes et les jurés avec leurs codes d'accès.",
      },
      {
        property: "og:title",
        content: "Espace président — Pilotage de la compétition",
      },
      {
        property: "og:description",
        content: "Compétition, critères, équipes, jurés et clôture en un seul écran.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresidentPage,
});

function PresidentPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AppSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = readSession();
    setSession(s);
    setReady(true);
    if (!s) navigate({ to: "/login" });
    else if (s.role === "admin") navigate({ to: "/admin" });
    else if (!s.isPresident) navigate({ to: "/vote" });
  }, [navigate]);

  const myCode = session?.role === "jury" ? session.code : "";
  const myId = session?.role === "jury" ? session.juryId : "";
  const competitionId = session?.role === "jury" ? session.competitionId : null;
  const { competition, criteria, teams, juries } = useCompetition(competitionId);

  const [newComp, setNewComp] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [newCrit, setNewCrit] = useState({ label: "", max: "10" });
  const [newJury, setNewJury] = useState({ name: "", code: "" });
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [myComps, setMyComps] = useState<
    { id: string; name: string; locked: boolean }[]
  >([]);

  const loadMyComps = useCallback(async () => {
    if (!myId) return;
    const { data } = await supabase
      .from("competitions")
      .select("id, name, locked, created_at")
      .eq("owner_jury_id", myId)
      .order("created_at", { ascending: false });
    setMyComps(
      (data ?? []).map((c) => ({ id: c.id, name: c.name, locked: c.locked })),
    );
  }, [myId]);

  useEffect(() => {
    loadMyComps();
  }, [loadMyComps, competition?.name, competition?.locked]);

  const refreshCodes = useCallback(async () => {
    if (!myCode || !competitionId) return;
    try {
      const rows = await listJuryCodes({ data: { code: myCode, competitionId } });
      setCodes(Object.fromEntries(rows.map((r) => [r.jury_id, r.code])));
    } catch {
      /* ignore */
    }
  }, [myCode, competitionId]);

  useEffect(() => {
    refreshCodes();
  }, [refreshCodes, juries.length]);

  const switchCompetition = async (id: string) => {
    if (!myId || id === competitionId) return;
    await supabase.from("juries").update({ competition_id: id }).eq("id", myId);
    updateSession({ competitionId: id });
    setSession(readSession());
  };

  const createCompetition = async () => {
    const name = newComp.trim();
    if (!name || !myId) { toast.error("Nom de la compétition requis."); return; }
    const { data, error } = await supabase
      .from("competitions")
      .insert({ name, owner_jury_id: myId })
      .select("id")
      .maybeSingle();
    if (error || !data) { toast.error("Erreur : " + (error?.message ?? "")); return; }
    await supabase.from("criteria").insert(
      DEFAULT_CRITERIA.map((c, i) => ({
        competition_id: data.id,
        label: c.label,
        max_points: c.max_points,
        position: i,
      })),
    );
    await supabase.from("juries").update({ competition_id: data.id }).eq("id", myId);
    updateSession({ competitionId: data.id });
    setSession(readSession());
    setNewComp("");
    await loadMyComps();
    toast.success("Compétition créée avec les critères par défaut.");
  };

  const deleteCompetition = async (id: string, name: string) => {
    if (!confirm(`Supprimer la compétition « ${name} » et toutes ses données ?`))
      return;
    await supabase.from("scores").delete().eq("competition_id", id);
    await supabase.from("criteria").delete().eq("competition_id", id);
    await supabase.from("teams").delete().eq("competition_id", id);
    await supabase
      .from("juries")
      .delete()
      .eq("competition_id", id)
      .eq("is_president", false);
    if (myId)
      await supabase
        .from("juries")
        .update({ competition_id: null })
        .eq("id", myId)
        .eq("competition_id", id);
    await supabase.from("competitions").delete().eq("id", id);
    if (id === competitionId) {
      updateSession({ competitionId: null });
      setSession(readSession());
    }
    await loadMyComps();
    toast.success("Compétition supprimée");
  };


  const renameCompetition = async (name: string) => {
    if (!competition) return;
    await supabase.from("competitions").update({ name }).eq("id", competition.id);
  };

  const toggleLock = async () => {
    if (!competition) return;
    const next = !competition.locked;
    const { error } = await supabase
      .from("competitions")
      .update({ locked: next })
      .eq("id", competition.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(next ? "Compétition clôturée 🏆" : "Modifications rouvertes");
  };

  const addCriterion = async () => {
    if (!competitionId) return;
    const label = newCrit.label.trim();
    const max = parseFloat(newCrit.max);
    if (!label || isNaN(max) || max <= 0)
      { toast.error("Libellé et points requis."); return; }
    const { error } = await supabase.from("criteria").insert({
      competition_id: competitionId,
      label,
      max_points: max,
      position: criteria.length,
    });
    if (error) { toast.error("Erreur : " + error.message); return; }
    setNewCrit({ label: "", max: "10" });
  };

  const addTeam = async () => {
    if (!competitionId) return;
    const name = newTeam.trim();
    if (!name) { toast.error("Nom d'équipe requis."); return; }
    const nextNum = teams.reduce((m, t) => Math.max(m, t.project_number), 0) + 1;
    const { error } = await supabase
      .from("teams")
      .insert({ competition_id: competitionId, project_number: nextNum, name });
    if (error) { toast.error("Erreur : " + error.message); return; }
    setNewTeam("");
  };

  const addJury = async () => {
    if (!competitionId || !myCode) return;
    const name = newJury.name.trim();
    if (!name) { toast.error("Nom du juré requis."); return; }
    if (!/^\d{3,8}$/.test(newJury.code.trim()))
      { toast.error("Code : 3 à 8 chiffres."); return; }
    const { data, error } = await supabase
      .from("juries")
      .insert({ competition_id: competitionId, name, is_president: false })
      .select("id")
      .maybeSingle();
    if (error || !data) { toast.error("Erreur : " + (error?.message ?? "")); return; }
    try {
      await setJuryCode({
        data: { code: myCode, juryId: data.id, juryCode: newJury.code.trim() },
      });
    } catch (e) {
      await supabase.from("juries").delete().eq("id", data.id);
      { toast.error((e as Error).message); return; }
    }
    setNewJury({ name: "", code: "" });
    refreshCodes();
    toast.success("Juré ajouté");
  };

  const changeCode = async (juryId: string, juryCode: string) => {
    if (!myCode) return;
    try {
      await setJuryCode({ data: { code: myCode, juryId, juryCode } });
      refreshCodes();
      toast.success("Code mis à jour");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };


  if (!ready || !session || session.role !== "jury" || !session.isPresident) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <header className="border-b bg-gradient-to-br from-primary to-[color:var(--primary-glow)] text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/" className="text-xs opacity-80 hover:opacity-100">
              <ArrowLeft className="mr-1 inline h-3 w-3" /> Classement public
            </Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Espace président — {session.juryName}
            </h1>
            <p className="text-xs opacity-90">
              {competition ? competition.name : "Aucune compétition en cours"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {competition && (
              <>
                <Button variant="secondary" onClick={() => navigate({ to: "/vote" })}>
                  Mes notes
                </Button>
                <Button variant={competition.locked ? "outline" : "destructive"} onClick={toggleLock}>
                  {competition.locked ? (
                    <>
                      <Unlock className="mr-2 h-4 w-4" /> Rouvrir
                    </>
                  ) : (
                    <>
                      <Megaphone className="mr-2 h-4 w-4" /> Clôturer & proclamer
                    </>
                  )}
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                clearSession();
                navigate({ to: "/login" });
              }}
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Card className="p-4">
          <h2 className="text-sm font-semibold">Mes compétitions</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Créez-en autant que nécessaire et basculez d'une compétition à l'autre ;
            chaque compétition a ses propres critères, équipes et jurés.
          </p>
          <div className="mt-3 space-y-2">
            {myComps.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 rounded-md border p-2 ${
                  c.id === competitionId ? "border-primary bg-primary/5" : ""
                }`}
              >
                <span className="flex-1 text-sm">
                  {c.name}
                  {c.locked && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-600">
                      <Lock className="h-3 w-3" /> clôturée
                    </span>
                  )}
                </span>
                {c.id === competitionId ? (
                  <span className="text-xs font-medium text-primary">Active</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => switchCompetition(c.id)}>
                    Activer
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteCompetition(c.id, c.name)}
                  aria-label="Supprimer la compétition"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2 md:flex-row">
              <Input
                placeholder="Nouvelle compétition (ex. MARKETING DIGITAL COMPETITION)"
                value={newComp}
                onChange={(e) => setNewComp(e.target.value)}
              />
              <Button onClick={createCompetition}>
                <Plus className="mr-2 h-4 w-4" /> Créer
              </Button>
            </div>
          </div>
        </Card>

        {!competition ? null : (
          <>
            <Card className="space-y-3 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label>Nom de la compétition active</Label>
                  <Input
                    key={competition.id}
                    defaultValue={competition.name}
                    onBlur={(e) =>
                      renameCompetition(e.target.value.trim() || competition.name)
                    }
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Total maximum : {totalMax(criteria)} points
                {competition.locked && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                    <Lock className="h-3 w-3" /> clôturée
                  </span>
                )}
              </p>
            </Card>

            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> Critères & quotas
              </h2>
              <div className="mt-3 space-y-2">
                {criteria.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Input
                      defaultValue={c.label}
                      onBlur={(e) =>
                        supabase
                          .from("criteria")
                          .update({ label: e.target.value.trim() || c.label })
                          .eq("id", c.id)
                      }
                    />
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      defaultValue={Number(c.max_points)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v > 0)
                          supabase.from("criteria").update({ max_points: v }).eq("id", c.id);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Supprimer le critère « ${c.label} » ?`)) return;
                        await supabase.from("criteria").delete().eq("id", c.id);
                      }}
                      aria-label="Supprimer le critère"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Nouveau critère"
                    value={newCrit.label}
                    onChange={(e) => setNewCrit((n) => ({ ...n, label: e.target.value }))}
                  />
                  <Input
                    type="number"
                    min={1}
                    className="w-24"
                    value={newCrit.max}
                    onChange={(e) => setNewCrit((n) => ({ ...n, max: e.target.value }))}
                  />
                  <Button onClick={addCriterion}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-semibold">Équipes</h2>
              <div className="mt-3 space-y-2">
                {teams.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="w-8 font-mono text-xs text-muted-foreground">
                      {t.project_number}
                    </span>
                    <Input
                      defaultValue={t.name}
                      onBlur={(e) =>
                        supabase
                          .from("teams")
                          .update({ name: e.target.value.trim() || t.name })
                          .eq("id", t.id)
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Supprimer « ${t.name} » ?`)) return;
                        await supabase.from("teams").delete().eq("id", t.id);
                      }}
                      aria-label="Supprimer l'équipe"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Nouvelle équipe"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                  />
                  <Button onClick={addTeam}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" /> Membres du jury & codes d'accès
              </h2>
              <div className="mt-3 space-y-2">
                {juries.map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-2">
                    <Input
                      defaultValue={j.name}
                      className="flex-1"
                      disabled={j.id === myId}
                      onBlur={(e) =>
                        supabase
                          .from("juries")
                          .update({ name: e.target.value.trim() || j.name })
                          .eq("id", j.id)
                      }
                    />
                    {j.is_president ? (
                      <span className="text-xs text-muted-foreground">Président</span>
                    ) : (
                      <>
                        <Input
                          className="w-28 text-center tracking-widest"
                          key={codes[j.id] ?? j.id}
                          defaultValue={codes[j.id] ?? ""}
                          placeholder="code"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== codes[j.id]) changeCode(j.id, v);
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            if (!confirm(`Supprimer le juré « ${j.name} » ?`)) return;
                            await supabase.from("juries").delete().eq("id", j.id);
                            refreshCodes();
                          }}
                          aria-label="Supprimer le juré"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Input
                    placeholder="Nom du juré"
                    className="flex-1"
                    value={newJury.name}
                    onChange={(e) => setNewJury((n) => ({ ...n, name: e.target.value }))}
                  />
                  <Input
                    className="w-28 text-center tracking-widest"
                    placeholder="code"
                    inputMode="numeric"
                    value={newJury.code}
                    onChange={(e) => setNewJury((n) => ({ ...n, code: e.target.value }))}
                  />
                  <Button onClick={addJury}>
                    <Plus className="mr-2 h-4 w-4" /> Ajouter
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
