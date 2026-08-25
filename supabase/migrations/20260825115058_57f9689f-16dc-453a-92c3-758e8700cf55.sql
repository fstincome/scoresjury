CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Nouvelle compétition',
  locked boolean NOT NULL DEFAULT false,
  owner_jury_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO anon, authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read competitions" ON public.competitions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert competitions" ON public.competitions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update competitions" ON public.competitions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete competitions" ON public.competitions FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER competitions_updated_at BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Critère',
  max_points numeric NOT NULL DEFAULT 10,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.criteria TO anon, authenticated;
GRANT ALL ON public.criteria TO service_role;
ALTER TABLE public.criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read criteria" ON public.criteria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert criteria" ON public.criteria FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update criteria" ON public.criteria FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete criteria" ON public.criteria FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER criteria_updated_at BEFORE UPDATE ON public.criteria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  project_number integer NOT NULL,
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, project_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO anon, authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert teams" ON public.teams FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update teams" ON public.teams FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete teams" ON public.teams FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.juries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES public.competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_president boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.juries TO anon, authenticated;
GRANT ALL ON public.juries TO service_role;
ALTER TABLE public.juries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read juries" ON public.juries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert juries" ON public.juries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update juries" ON public.juries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete juries" ON public.juries FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER juries_updated_at BEFORE UPDATE ON public.juries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.competitions ADD CONSTRAINT competitions_owner_jury_fk FOREIGN KEY (owner_jury_id) REFERENCES public.juries(id) ON DELETE SET NULL;

CREATE TABLE public.scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  jury_id uuid NOT NULL REFERENCES public.juries(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.criteria(id) ON DELETE CASCADE,
  value numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jury_id, team_id, criterion_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scores TO anon, authenticated;
GRANT ALL ON public.scores TO service_role;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scores" ON public.scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert scores" ON public.scores FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update scores" ON public.scores FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete scores" ON public.scores FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER scores_updated_at BEFORE UPDATE ON public.scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('admin','jury')),
  jury_id uuid REFERENCES public.juries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to access_codes" ON public.access_codes FOR SELECT TO anon, authenticated USING (false);
CREATE TRIGGER access_codes_updated_at BEFORE UPDATE ON public.access_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.competitions REPLICA IDENTITY FULL;
ALTER TABLE public.criteria REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.juries REPLICA IDENTITY FULL;
ALTER TABLE public.scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.criteria;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.juries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;

-- ============ Fonctions sécurisées (remplacent le serveur applicatif) ============

CREATE OR REPLACE FUNCTION public.app_login_with_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; j record;
BEGIN
  p_code := btrim(coalesce(p_code, ''));
  IF p_code = '' THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT role, jury_id INTO r FROM access_codes WHERE code = p_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  IF r.role = 'admin' THEN RETURN jsonb_build_object('ok', true, 'role', 'admin'); END IF;
  IF r.jury_id IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT id, name, is_president, competition_id INTO j FROM juries WHERE id = r.jury_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  RETURN jsonb_build_object('ok', true, 'role', 'jury', 'juryId', j.id, 'juryName', j.name,
    'isPresident', j.is_president, 'competitionId', j.competition_id);
END; $$;

CREATE OR REPLACE FUNCTION public.app_is_admin(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM access_codes WHERE code = btrim(coalesce(p_code,'')) AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.app_president_id(p_code text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id FROM access_codes a JOIN juries j ON j.id = a.jury_id
  WHERE a.code = btrim(coalesce(p_code,'')) AND a.role = 'jury' AND j.is_president;
$$;

CREATE OR REPLACE FUNCTION public.app_assign_code(p_jury_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing record;
BEGIN
  p_code := btrim(coalesce(p_code, ''));
  IF p_code !~ '^\d{3,8}$' THEN RAISE EXCEPTION 'Le code doit contenir 3 à 8 chiffres'; END IF;
  SELECT id, jury_id INTO existing FROM access_codes WHERE code = p_code;
  IF FOUND AND existing.jury_id IS DISTINCT FROM p_jury_id THEN
    RAISE EXCEPTION 'Ce code est déjà utilisé';
  END IF;
  DELETE FROM access_codes WHERE jury_id = p_jury_id;
  INSERT INTO access_codes (code, role, jury_id) VALUES (p_code, 'jury', p_jury_id);
END; $$;

CREATE OR REPLACE FUNCTION public.app_list_presidents(p_admin_code text)
RETURNS TABLE (id uuid, name text, code text, "competitionId" uuid, "competitionName" text, locked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app_is_admin(p_admin_code) THEN RAISE EXCEPTION 'Accès administrateur refusé'; END IF;
  RETURN QUERY
    SELECT j.id, j.name, coalesce(a.code, ''), j.competition_id, c.name, coalesce(c.locked, false)
    FROM juries j
    LEFT JOIN access_codes a ON a.jury_id = j.id
    LEFT JOIN competitions c ON c.id = j.competition_id
    WHERE j.is_president
    ORDER BY j.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.app_create_president(p_admin_code text, p_name text, p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT app_is_admin(p_admin_code) THEN RAISE EXCEPTION 'Accès administrateur refusé'; END IF;
  p_name := btrim(coalesce(p_name, ''));
  IF p_name = '' THEN RAISE EXCEPTION 'Nom du président requis'; END IF;
  INSERT INTO juries (name, is_president, competition_id) VALUES (p_name, true, NULL) RETURNING id INTO new_id;
  PERFORM app_assign_code(new_id, p_code);
  RETURN new_id;
END; $$;

CREATE OR REPLACE FUNCTION public.app_set_president_code(p_admin_code text, p_president_id uuid, p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app_is_admin(p_admin_code) THEN RAISE EXCEPTION 'Accès administrateur refusé'; END IF;
  PERFORM app_assign_code(p_president_id, p_code);
END; $$;

CREATE OR REPLACE FUNCTION public.app_delete_president(p_admin_code text, p_president_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app_is_admin(p_admin_code) THEN RAISE EXCEPTION 'Accès administrateur refusé'; END IF;
  DELETE FROM access_codes WHERE jury_id = p_president_id;
  DELETE FROM juries WHERE id = p_president_id;
END; $$;

CREATE OR REPLACE FUNCTION public.app_list_jury_codes(p_code text, p_competition_id uuid)
RETURNS TABLE (jury_id uuid, code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_president_id(p_code) IS NULL THEN RAISE EXCEPTION 'Accès président refusé'; END IF;
  RETURN QUERY
    SELECT a.jury_id, a.code FROM access_codes a
    JOIN juries j ON j.id = a.jury_id
    WHERE j.competition_id = p_competition_id;
END; $$;

CREATE OR REPLACE FUNCTION public.app_set_jury_code(p_code text, p_jury_id uuid, p_jury_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF app_president_id(p_code) IS NULL THEN RAISE EXCEPTION 'Accès président refusé'; END IF;
  PERFORM app_assign_code(p_jury_id, p_jury_code);
END; $$;

REVOKE ALL ON FUNCTION public.app_assign_code(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_login_with_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_list_presidents(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_president(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_set_president_code(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_delete_president(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_list_jury_codes(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_set_jury_code(text, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.app_is_admin(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.app_president_id(text) FROM anon, authenticated;

-- ============ Données de démonstration ============

INSERT INTO public.competitions (id, name, locked) VALUES ('11111111-1111-4111-8111-111111111111', 'Marketing Digital Competition', false);

INSERT INTO public.criteria (competition_id, label, max_points, position) VALUES
 ('11111111-1111-4111-8111-111111111111', 'Innovation', 25, 0),
 ('11111111-1111-4111-8111-111111111111', 'Impact', 25, 1),
 ('11111111-1111-4111-8111-111111111111', 'Faisabilité', 20, 2),
 ('11111111-1111-4111-8111-111111111111', 'Prototype', 10, 3),
 ('11111111-1111-4111-8111-111111111111', 'Pitch', 10, 4),
 ('11111111-1111-4111-8111-111111111111', 'Questions', 10, 5);

INSERT INTO public.teams (competition_id, project_number, name) VALUES
 ('11111111-1111-4111-8111-111111111111', 1, 'Turiho'),
 ('11111111-1111-4111-8111-111111111111', 2, 'Gitega Street Marketing'),
 ('11111111-1111-4111-8111-111111111111', 3, 'Echo Creative Studio'),
 ('11111111-1111-4111-8111-111111111111', 4, 'Burundi e-Market'),
 ('11111111-1111-4111-8111-111111111111', 5, 'Kwiga Design'),
 ('11111111-1111-4111-8111-111111111111', 6, 'Ingoma Creative Hub'),
 ('11111111-1111-4111-8111-111111111111', 7, 'Marketing Solutions Agency'),
 ('11111111-1111-4111-8111-111111111111', 8, 'Gitega Influencers Network');

INSERT INTO public.juries (id, competition_id, name, is_president) VALUES
 ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'Juré 1', false),
 ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Juré 2 (Président)', true),
 ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'Juré 3', false);

INSERT INTO public.access_codes (code, role, jury_id) VALUES
 ('9999', 'admin', NULL),
 ('1111', 'jury', '22222222-2222-4222-8222-222222222201'),
 ('2222', 'jury', '22222222-2222-4222-8222-222222222202'),
 ('3333', 'jury', '22222222-2222-4222-8222-222222222203');