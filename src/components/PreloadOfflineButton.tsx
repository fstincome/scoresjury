import { useState } from "react";
import { CloudDownload, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { preloadOfflineData, readPreloadedAt } from "@/lib/preloadOffline";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

/** Met en cache classement + écran de vote pour un accès hors connexion. */
export function PreloadOfflineButton({
  variant = "secondary",
  size = "lg",
}: {
  variant?: "secondary" | "outline" | "ghost" | "default";
  size?: "sm" | "lg" | "default";
}) {
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState<number | null>(() => readPreloadedAt());

  const run = async () => {
    setBusy(true);
    try {
      const r = await preloadOfflineData();
      setAt(readPreloadedAt());
      toast.success(
        `Hors ligne prêt ✓ ${r.competitions} compétition(s), ${r.teams} équipe(s), ${r.scores} note(s)`,
      );
    } catch (e) {
      toast.error("Préchargement impossible : " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={run}
      disabled={busy || !online}
      title={
        at
          ? `Dernier préchargement : ${new Date(at).toLocaleString("fr-FR")}`
          : "Télécharger les données pour un accès hors connexion"
      }
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : at ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <CloudDownload className="mr-2 h-4 w-4" />
      )}
      {busy ? "Préchargement…" : at ? "Hors ligne prêt" : "Précharger hors ligne"}
    </Button>
  );
}
