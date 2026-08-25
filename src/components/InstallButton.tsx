import { useState } from "react";
import { Download, Share, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

/**
 * Always-available way to install the app: uses the browser install prompt when
 * offered, otherwise explains the manual steps for the current platform.
 */
export function InstallButton({
  variant = "secondary",
  size = "lg",
}: {
  variant?: "secondary" | "outline" | "ghost";
  size?: "sm" | "lg" | "default";
}) {
  const { canPrompt, installed, platform, promptInstall } = useInstallPrompt();
  const [helpOpen, setHelpOpen] = useState(false);

  if (installed) return null;

  const onClick = async () => {
    const result = await promptInstall();
    if (result === "unavailable") setHelpOpen(true);
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={onClick} aria-label="Installer l'application">
        <Download className="mr-2 h-4 w-4" />
        Installer l'app
      </Button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Installer JuryScore</DialogTitle>
            <DialogDescription>
              Ajoutez l'application à votre écran d'accueil pour l'ouvrir comme une app native.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-3 text-sm text-foreground">
            {platform === "ios" ? (
              <>
                <li className="flex items-start gap-2">
                  <Share className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Ouvrez le menu <strong>Partager</strong> de Safari (en bas de l'écran).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Choisissez <strong>« Sur l'écran d'accueil »</strong>, puis{" "}
                    <strong>Ajouter</strong>.
                  </span>
                </li>
              </>
            ) : platform === "android" ? (
              <>
                <li className="flex items-start gap-2">
                  <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Ouvrez le menu <strong>⋮</strong> de Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Plus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Touchez <strong>« Installer l'application »</strong> ou{" "}
                    <strong>« Ajouter à l'écran d'accueil »</strong>.
                  </span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2">
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Cliquez sur l'icône d'installation dans la barre d'adresse (à droite de l'URL).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Ou menu du navigateur → <strong>« Installer JuryScore »</strong>.
                  </span>
                </li>
              </>
            )}
          </ol>

          {!canPrompt && (
            <p className="text-xs text-muted-foreground">
              Astuce : l'installation nécessite le site publié en HTTPS (elle est indisponible dans
              l'aperçu intégré).
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
