import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

const DISMISS_KEY = "juryscore-install-dismissed";

export function InstallPrompt() {
  const { canPrompt, installed, platform, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const iosHint = platform === "ios" && !canPrompt;
  const visible = !installed && !dismissed && (canPrompt || iosHint);
  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    await promptInstall();
    dismiss();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <img
            src="/icon-192.png"
            alt="JuryScore"
            width={44}
            height={44}
            loading="lazy"
            className="rounded-lg"
          />
          <div className="flex-1">
            <p className="font-semibold text-foreground">Installer JuryScore</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {iosHint ? (
                <>
                  Appuyez sur <Share className="inline h-4 w-4" /> puis « Sur l'écran d'accueil ».
                </>
              ) : (
                "Ajoutez l'application à votre écran d'accueil pour un accès rapide."
              )}
            </p>
            {!iosHint && (
              <Button size="sm" className="mt-3" onClick={install}>
                <Download className="mr-2 h-4 w-4" />
                Installer
              </Button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Fermer"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
