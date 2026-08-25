import { supabase } from "@/integrations/supabase/client";

/**
 * Gestion des codes d'accès — 100 % côté navigateur.
 *
 * Aucun serveur Node n'est requis : toute la logique sensible vit dans des
 * fonctions SQL SECURITY DEFINER de la base. La table `access_codes` reste
 * illisible depuis le navigateur ; seules ces fonctions peuvent la consulter,
 * après vérification du code administrateur ou président.
 *
 * Les signatures gardent la forme `fn({ data: ... })` utilisée par les pages.
 */

export type LoginResult =
  | { ok: false }
  | { ok: true; role: "admin" }
  | {
      ok: true;
      role: "jury";
      juryId: string;
      juryName: string;
      isPresident: boolean;
      competitionId: string | null;
    };

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function loginWithCode({
  data,
}: {
  data: { code: string };
}): Promise<LoginResult> {
  const res = await supabase.rpc("app_login_with_code", {
    p_code: String(data?.code ?? "").trim(),
  });
  const payload = unwrap(res) as unknown as LoginResult | null;
  return payload ?? { ok: false };
}

export type PresidentRow = {
  id: string;
  name: string;
  code: string;
  competitionId: string | null;
  competitionName: string | null;
  locked: boolean;
};

export async function listPresidents({
  data,
}: {
  data: { adminCode: string };
}): Promise<PresidentRow[]> {
  const res = await supabase.rpc("app_list_presidents", {
    p_admin_code: String(data?.adminCode ?? ""),
  });
  return (unwrap(res) ?? []) as unknown as PresidentRow[];
}

export async function createPresident({
  data,
}: {
  data: { adminCode: string; name: string; code: string };
}): Promise<{ id: string }> {
  const res = await supabase.rpc("app_create_president", {
    p_admin_code: String(data?.adminCode ?? ""),
    p_name: String(data?.name ?? "").trim(),
    p_code: String(data?.code ?? "").trim(),
  });
  return { id: unwrap(res) as unknown as string };
}

export async function setPresidentCode({
  data,
}: {
  data: { adminCode: string; presidentId: string; code: string };
}): Promise<{ ok: true }> {
  unwrap(
    await supabase.rpc("app_set_president_code", {
      p_admin_code: String(data?.adminCode ?? ""),
      p_president_id: String(data?.presidentId ?? ""),
      p_code: String(data?.code ?? "").trim(),
    }),
  );
  return { ok: true };
}

export async function deletePresident({
  data,
}: {
  data: { adminCode: string; presidentId: string };
}): Promise<{ ok: true }> {
  unwrap(
    await supabase.rpc("app_delete_president", {
      p_admin_code: String(data?.adminCode ?? ""),
      p_president_id: String(data?.presidentId ?? ""),
    }),
  );
  return { ok: true };
}

export async function listJuryCodes({
  data,
}: {
  data: { code: string; competitionId: string };
}): Promise<{ jury_id: string; code: string }[]> {
  const res = await supabase.rpc("app_list_jury_codes", {
    p_code: String(data?.code ?? ""),
    p_competition_id: String(data?.competitionId ?? ""),
  });
  return (unwrap(res) ?? []) as unknown as { jury_id: string; code: string }[];
}

export async function setJuryCode({
  data,
}: {
  data: { code: string; juryId: string; juryCode: string };
}): Promise<{ ok: true }> {
  unwrap(
    await supabase.rpc("app_set_jury_code", {
      p_code: String(data?.code ?? ""),
      p_jury_id: String(data?.juryId ?? ""),
      p_jury_code: String(data?.juryCode ?? "").trim(),
    }),
  );
  return { ok: true };
}
