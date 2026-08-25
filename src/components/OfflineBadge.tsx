import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

export function OfflineBadge({ className = "" }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium ${className}`}
    >
      <WifiOff className="h-3 w-3" /> Hors connexion — données en cache
    </span>
  );
}
