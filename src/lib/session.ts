export type AppSession =
  | { role: "admin"; code: string }
  | {
      role: "jury";
      code: string;
      juryId: string;
      juryName: string;
      isPresident: boolean;
      competitionId: string | null;
    };

const KEY = "mdc_session";

export function readSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(s: AppSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function updateSession(patch: Partial<Extract<AppSession, { role: "jury" }>>) {
  const s = readSession();
  if (!s || s.role !== "jury") return;
  writeSession({ ...s, ...patch });
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
