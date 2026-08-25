import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Lock, LogOut, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import {
  createPresident,
  deletePresident,
  listPresidents,
  setPresidentCode,
} from "@/lib/access.functions";
import { clearSession, readSession } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Présidents de jury" },
      {
        name: "description",
        content:
          "Créez les présidents de jury et attribuez-leur un code d'accès pour piloter leur compétition.",
      },
      { property: "og:title", content: "Administration — Présidents de jury" },
      {
        property: "og:description",
        content: "Gestion centralisée des présidents de jury et de leurs codes d'accès.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type PresidentRow = {
  id: string;
  name: string;
  code: string;
  competitionId: string | null;
  competitionName: string | null;
  locked: boolean;
};

function AdminPage() {
  const navigate = useNavigate();
  const [adminCode, setAdminCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<PresidentRow[]>([]);
  const [form, setForm] = useState({ name: "", code: "" });

  useEffect(() => {
    const s = readSession();
    setReady(true);
    if (!s || s.role !== "admin") navigate({ to: "/login" });
    else setAdminCode(s.code);
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (!adminCode) return;
    try {
      setRows(await listPresidents({ data: { adminCode } }));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [adminCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    if (!adminCode) return;
    try {
      await createPresident({
        data: { adminCode, name: form.name.trim(), code: form.code.trim() },
      });
      setForm({ name: "", code: "" });
      refresh();
      toast.success("Président créé");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const changeCode = async (presidentId: string, code: string) => {
    if (!adminCode) return;
    try {
      await setPresidentCode({ data: { adminCode, presidentId, code } });
      refresh();
      toast.success("Code mis à jour");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (p: PresidentRow) => {
    if (!adminCode) return;
    if (!confirm(`Supprimer le président « ${p.name} » ?`)) return;
    try {
      await deletePresident({ data: { adminCode, presidentId: p.id } });
      refresh();
      toast.success("Président supprimé");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (!ready || !adminCode) {
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
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link to="/" className="text-xs opacity-80 hover:opacity-100">
              <ArrowLeft className="mr-1 inline h-3 w-3" /> Classement public
            </Link>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">Administration</h1>
            <p className="text-xs opacity-90">
              {rows.length} président{rows.length > 1 ? "s" : ""} de jury
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              clearSession();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Quitter
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" /> Nouveau président de jury
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Le président créera ensuite lui-même sa compétition, ses critères et ses jurés.
          </p>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="pname">Nom du président</Label>
              <Input
                id="pname"
                placeholder="Ex. Jean Ndayisenga"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcode">Code d'accès</Label>
              <Input
                id="pcode"
                className="w-32 text-center tracking-widest"
                placeholder="1234"
                inputMode="numeric"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <Button onClick={add}>
              <Plus className="mr-2 h-4 w-4" /> Créer
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Présidents & compétitions</h2>
          <div className="mt-3 divide-y">
            {rows.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.competitionName ? (
                      <>
                        {p.competitionName}
                        {p.locked && (
                          <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                            <Lock className="h-3 w-3" /> clôturée
                          </span>
                        )}
                      </>
                    ) : (
                      "Aucune compétition créée pour l'instant"
                    )}
                  </p>
                </div>
                <Input
                  className="w-28 text-center tracking-widest"
                  defaultValue={p.code}
                  key={p.code || p.id}
                  placeholder="code"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== p.code) changeCode(p.id, v);
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(p)}
                  aria-label="Supprimer le président"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun président pour l'instant.
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
