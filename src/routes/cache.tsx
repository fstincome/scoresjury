import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Database, FileStack, HardDrive, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  clearAll,
  clearGroup,
  formatBytes,
  readGroups,
  readPagesCache,
  readStorageEstimate,
  type CacheGroup,
  type CacheGroupId,
} from "@/lib/cacheManager";

export const Route = createFileRoute("/cache")({
  head: () => ({
    meta: [
      { title: "Gestion du cache — Espace utilisé & nettoyage" },
      {
        name: "description",
        content:
          "Consultez l'espace occupé par les données hors connexion et supprimez sélectivement les caches classement, vote ou données.",
      },
      { property: "og:title", content: "Gestion du cache hors connexion" },
      {
        property: "og:description",
        content: "Voir l'espace utilisé et vider les caches de JuryScore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CachePage;
});

const ICONS: Record<CacheGroupId, typeof Database> = {
  ranking: FileStack,
  vote: PenLine,
  data: Database,
};

function CachePage() {
  const [groups, setGroups] = useState<CacheGroup[]>([]);
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const base = readGroups();
    const pages = await readPagesCache();
    setGroups(
      base.map((g) => (g.id === "ranking" ? { ...g, bytes: pages.bytes, items: pages.items } : g)),
    );
    setEstimate(await readStorageEstimate());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const total = groups.reduce((s, g) => s + g.bytes, 0);

  const remove = async (id: CacheGroupId, label: string) => {
    setBusy(id);
    try {
      await clearGroup(id);
      await refresh();
      toast.success(`${label} supprimé`);
    } finally {
      setBusy(null);
    }
  };

  const removeAll = async () => {
    setBusy("all");
    try {
      await clearAll();
      await refresh();
      toast.success("Tous les caches ont été supprimés");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors />
      <header className="border-b bg-gradient-to-br from-primary to-[color:var(--primary-glow)] text-primary-foreground">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-6 py-8">
          <Link to="/" className="inline-flex items-center text-sm opacity-90 hover:opacity-100">
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour au classement
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Gestion du cache</h1>
          <p className="text-sm opacity-90">
            Espace utilisé par les données hors connexion et suppression sélective.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Card className="flex items-center gap-4 p-5">
          <HardDrive className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <div className="text-2xl font-bold tabular-nums">{formatBytes(total)}</div>
            <p className="text-xs text-muted-foreground">
              Total des caches JuryScore
              {estimate && estimate.quota > 0
                ? ` · navigateur : ${formatBytes(estimate.usage)} sur ${formatBytes(estimate.quota)}`
                : ""}
            </p>
          </div>
          <Button variant="destructive" onClick={removeAll} disabled={busy !== null}>
            <Trash2 className="mr-2 h-4 w-4" /> Tout vider
          </Button>
        </Card>

        <div className="space-y-3">
          {groups.map((g) => {
            const Icon = ICONS[g.id];
            return (
              <Card key={g.id} className="flex items-start gap-4 p-5">
                <Icon className="mt-1 h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{g.label}</div>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatBytes(g.bytes)} · {g.items} élément{g.items > 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy !== null || g.items === 0}
                  onClick={() => remove(g.id, g.label)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Astuce : supprimez « Brouillons & notes en attente » uniquement si toutes vos notes ont
          bien été synchronisées, sinon les saisies non envoyées seront perdues.
        </p>
      </main>
    </div>
  );
}
