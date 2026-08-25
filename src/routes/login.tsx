import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { loginWithCode } from "@/lib/access";
import { writeSession } from "@/lib/session";
import { PreloadOfflineButton } from "@/components/PreloadOfflineButton";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Espace jury & administration" },
      {
        name: "description",
        content:
          "Entrez votre code d'accès pour rejoindre votre espace de notation ou l'administration des compétitions.",
      },
      { property: "og:title", content: "Connexion — Espace jury & administration" },
      {
        property: "og:description",
        content: "Accès sécurisé par code pour les jurés et l'administrateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await loginWithCode({ data: { code: code.trim() } });
      if (!res.ok) {
        toast.error("Code invalide.");
        return;
      }
      if (res.role === "admin") {
        writeSession({ role: "admin", code: code.trim() });
        navigate({ to: "/admin" });
      } else {
        writeSession({
          role: "jury",
          code: code.trim(),
          juryId: res.juryId,
          juryName: res.juryName,
          isPresident: res.isPresident,
          competitionId: res.competitionId,
        });
        navigate({ to: res.isPresident ? "/president" : "/vote" });
      }
    } catch {
      toast.error("Connexion impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Toaster richColors />
      <Card className="w-full max-w-md p-6">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 inline h-3 w-3" /> Retour au classement
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saisissez le code d'accès qui vous a été remis (juré ou administrateur).
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Code d'accès</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-2xl tracking-[0.4em]"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            <KeyRound className="mr-2 h-4 w-4" />
            {busy ? "Vérification..." : "Entrer"}
          </Button>
        </form>
        <div className="mt-6 border-t pt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Préparez la session : téléchargez le classement et l'écran de vote pour y accéder
            même sans connexion.
          </p>
          <PreloadOfflineButton variant="outline" size="default" />
        </div>
      </Card>
    </div>
  );
}
