import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "juryscore-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    if (isIos) {
      const t = setTimeout(() => {
        setIosHint(true);
        setOpen(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, "1");
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
