import { createServerFn } from "@tanstack/react-start";

type LoginResult =
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

export const loginWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => ({
    code: String(input?.code ?? "").trim(),
  }))
  .handler(async ({ data }): Promise<LoginResult> => {
    if (!data.code) return { ok: false };
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("access_codes")
      .select("role, jury_id")
      .eq("code", data.code)
      .maybeSingle();
    if (!row) return { ok: false };
    if (row.role === "admin") return { ok: true, role: "admin" };
    if (!row.jury_id) return { ok: false };
    const { data: jury } = await supabaseAdmin
      .from("juries")
      .select("id, name, is_president, competition_id")
      .eq("id", row.jury_id)
      .maybeSingle();
    if (!jury) return { ok: false };
    return {
      ok: true,
      role: "jury",
      juryId: jury.id,
      juryName: jury.name,
      isPresident: jury.is_president,
      competitionId: jury.competition_id,
    };
  });

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  return supabaseAdmin;
}

async function assertAdmin(code: string) {
  const db = await admin();
  const { data } = await db
    .from("access_codes")
    .select("role")
    .eq("code", String(code ?? "").trim())
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Accès administrateur refusé");
  return db;
}

/** Vérifie qu'un code appartient bien à un président. */
async function assertPresident(code: string) {
  const db = await admin();
  const { data: row } = await db
    .from("access_codes")
    .select("jury_id")
    .eq("code", String(code ?? "").trim())
    .eq("role", "jury")
    .maybeSingle();
  if (!row?.jury_id) throw new Error("Accès président refusé");
  const { data: jury } = await db
    .from("juries")
    .select("id, is_president")
    .eq("id", row.jury_id)
    .maybeSingle();
  if (!jury?.is_president) throw new Error("Accès président refusé");
  return { db, presidentId: jury.id };
}

function validCode(code: string) {
  if (!/^\d{3,8}$/.test(code)) throw new Error("Le code doit contenir 3 à 8 chiffres");
}

async function assignCode(
  db: Awaited<ReturnType<typeof admin>>,
  juryId: string,
  code: string,
) {
  validCode(code);
  const { data: existing } = await db
    .from("access_codes")
    .select("id, jury_id")
    .eq("code", code)
    .maybeSingle();
  if (existing && existing.jury_id !== juryId) {
    throw new Error("Ce code est déjà utilisé");
  }
  await db.from("access_codes").delete().eq("jury_id", juryId);
  const { error } = await db
    .from("access_codes")
    .insert({ code, role: "jury", jury_id: juryId });
  if (error) throw new Error(error.message);
}

/* ------------------------- ADMIN : gestion des présidents ------------------------- */

/** Liste les présidents et leurs codes (admin uniquement). */
export const listPresidents = createServerFn({ method: "POST" })
  .inputValidator((input: { adminCode: string }) => ({
    adminCode: String(input?.adminCode ?? ""),
  }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.adminCode);
    const { data: presidents } = await db
      .from("juries")
      .select("id, name, competition_id, created_at")
      .eq("is_president", true)
      .order("created_at");
    const ids = (presidents ?? []).map((p) => p.id);
    const codes = ids.length
      ? (await db.from("access_codes").select("jury_id, code").in("jury_id", ids)).data ?? []
      : [];
    const byId = new Map(codes.map((c) => [c.jury_id as string, c.code as string]));
    const compIds = (presidents ?? [])
      .map((p) => p.competition_id)
      .filter((v): v is string => !!v);
    const comps = compIds.length
      ? (await db.from("competitions").select("id, name, locked").in("id", compIds)).data ?? []
      : [];
    const compById = new Map(comps.map((c) => [c.id, c]));
    return (presidents ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      code: byId.get(p.id) ?? "",
      competitionId: p.competition_id,
      competitionName: p.competition_id
        ? compById.get(p.competition_id)?.name ?? null
        : null,
      locked: p.competition_id ? compById.get(p.competition_id)?.locked ?? false : false,
    }));
  });

/** Crée un président avec son code d'accès (admin uniquement). */
export const createPresident = createServerFn({ method: "POST" })
  .inputValidator((input: { adminCode: string; name: string; code: string }) => ({
    adminCode: String(input?.adminCode ?? ""),
    name: String(input?.name ?? "").trim(),
    code: String(input?.code ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.adminCode);
    if (!data.name) throw new Error("Nom du président requis");
    validCode(data.code);
    const { data: jury, error } = await db
      .from("juries")
      .insert({ name: data.name, is_president: true, competition_id: null })
      .select("id")
      .maybeSingle();
    if (error || !jury) throw new Error(error?.message ?? "Création impossible");
    try {
      await assignCode(db, jury.id, data.code);
    } catch (e) {
      await db.from("juries").delete().eq("id", jury.id);
      throw e;
    }
    return { id: jury.id };
  });

/** Met à jour le code d'un président (admin uniquement). */
export const setPresidentCode = createServerFn({ method: "POST" })
  .inputValidator((input: { adminCode: string; presidentId: string; code: string }) => ({
    adminCode: String(input?.adminCode ?? ""),
    presidentId: String(input?.presidentId ?? ""),
    code: String(input?.code ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.adminCode);
    await assignCode(db, data.presidentId, data.code);
    return { ok: true };
  });

/** Supprime un président (admin uniquement). */
export const deletePresident = createServerFn({ method: "POST" })
  .inputValidator((input: { adminCode: string; presidentId: string }) => ({
    adminCode: String(input?.adminCode ?? ""),
    presidentId: String(input?.presidentId ?? ""),
  }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.adminCode);
    await db.from("access_codes").delete().eq("jury_id", data.presidentId);
    await db.from("juries").delete().eq("id", data.presidentId);
    return { ok: true };
  });

/* ------------------------- PRÉSIDENT : gestion de ses jurés ------------------------- */

/** Liste les codes des jurés de la compétition du président. */
export const listJuryCodes = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; competitionId: string }) => ({
    code: String(input?.code ?? ""),
    competitionId: String(input?.competitionId ?? ""),
  }))
  .handler(async ({ data }) => {
    const { db } = await assertPresident(data.code);
    const { data: juries } = await db
      .from("juries")
      .select("id")
      .eq("competition_id", data.competitionId);
    const ids = (juries ?? []).map((j) => j.id);
    if (ids.length === 0) return [] as { jury_id: string; code: string }[];
    const { data: codes } = await db
      .from("access_codes")
      .select("jury_id, code")
      .in("jury_id", ids);
    return (codes ?? []).map((c) => ({
      jury_id: c.jury_id as string,
      code: c.code as string,
    }));
  });

/** Crée / met à jour le code d'un juré (président uniquement). */
export const setJuryCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; juryId: string; juryCode: string }) => ({
    code: String(input?.code ?? ""),
    juryId: String(input?.juryId ?? ""),
    juryCode: String(input?.juryCode ?? "").trim(),
  }))
  .handler(async ({ data }) => {
    const { db } = await assertPresident(data.code);
    await assignCode(db, data.juryId, data.juryCode);
    return { ok: true };
  });
