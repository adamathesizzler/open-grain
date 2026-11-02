-- Add session/theme grouping without changing service categories, photo IDs or publication.
CREATE TABLE public.portfolio_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 120),
 name_en text NOT NULL CHECK(char_length(name_en) BETWEEN 1 AND 120),
 sort_order integer NOT NULL DEFAULT 0
);
ALTER TABLE public.portfolio_projects ADD COLUMN group_id uuid REFERENCES public.portfolio_groups(id) ON DELETE SET NULL,
 ADD COLUMN group_position integer NOT NULL DEFAULT 0 CHECK(group_position>=0);
CREATE INDEX portfolio_projects_group_order_idx ON public.portfolio_projects(group_id,group_position);
ALTER TABLE public.portfolio_groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_groups FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.portfolio_groups TO anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.portfolio_groups TO authenticated;
CREATE POLICY "published photo groups" ON public.portfolio_groups FOR SELECT TO anon,authenticated
 USING(EXISTS(SELECT 1 FROM public.portfolio_projects p WHERE p.group_id=portfolio_groups.id AND p.is_published));
CREATE POLICY "admin manage photo groups" ON public.portfolio_groups FOR ALL TO authenticated
 USING(coalesce(public.is_admin(),false)) WITH CHECK(coalesce(public.is_admin(),false));

CREATE FUNCTION public.studio_portfolio_groups_snapshot() RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('groups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'name_en',name_en,'sort_order',sort_order) ORDER BY id) FROM public.portfolio_groups),'[]'::jsonb),
 'photos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'group_id',group_id,'group_position',group_position,'title',title,'cover_image_url',cover_image_url,'is_published',is_published,'status',status) ORDER BY id) FROM public.portfolio_projects),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.studio_portfolio_groups_snapshot() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studio_portfolio_groups_snapshot() TO authenticated;

CREATE FUNCTION public.studio_save_portfolio_groups(p_expected jsonb,p_groups jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE g jsonb; photo jsonb; group_ids uuid[]:='{}'; photo_ids uuid[]:='{}'; gid uuid; pid uuid; position integer; group_order integer:=0; written integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(1836020325,2);
 LOCK TABLE public.portfolio_groups,public.portfolio_projects IN SHARE ROW EXCLUSIVE MODE;
 IF public.studio_portfolio_groups_snapshot() IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Portfolio grouping changed; reload and review'; END IF;
 IF jsonb_typeof(p_groups) IS DISTINCT FROM 'array' OR jsonb_array_length(p_groups)>100 THEN RAISE EXCEPTION 'Invalid groups'; END IF;
 FOR g IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
  IF jsonb_typeof(g) IS DISTINCT FROM 'object' OR (g-ARRAY['id','name','name_en','photo_ids'])<>'{}'::jsonb OR jsonb_typeof(g->'id') IS DISTINCT FROM 'string' OR (g->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid group identity'; END IF;
  gid:=(g->>'id')::uuid;
  IF gid=ANY(group_ids) THEN RAISE EXCEPTION 'Repeated group'; END IF;
  group_ids:=array_append(group_ids,gid);
  IF jsonb_typeof(g->'name') IS DISTINCT FROM 'string' OR jsonb_typeof(g->'name_en') IS DISTINCT FROM 'string'
   OR char_length(g->>'name') NOT BETWEEN 1 AND 120 OR char_length(g->>'name_en') NOT BETWEEN 1 AND 120
   OR (g->>'name') ~ '[[:cntrl:]]' OR (g->>'name_en') ~ '[[:cntrl:]]'
   OR btrim(g->>'name',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')='' OR btrim(g->>'name_en',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')=''
   OR jsonb_typeof(g->'photo_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(g->'photo_ids') NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid group details'; END IF;
  FOR photo IN SELECT value FROM jsonb_array_elements(g->'photo_ids') LOOP
   IF jsonb_typeof(photo) IS DISTINCT FROM 'string' OR (photo#>>'{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid photo'; END IF;
   pid:=(photo#>>'{}')::uuid;
   IF pid=ANY(photo_ids) OR NOT EXISTS(SELECT 1 FROM public.portfolio_projects WHERE id=pid) THEN RAISE EXCEPTION 'Repeated or unavailable photo'; END IF;
   photo_ids:=array_append(photo_ids,pid);
  END LOOP;
 END LOOP;
 -- The following writes never change title, asset, category, status, amount or private links.
 UPDATE public.portfolio_projects SET group_id=NULL,group_position=0 WHERE group_id IS NOT NULL;
 DELETE FROM public.portfolio_groups WHERE NOT(id=ANY(group_ids));
 FOR g IN SELECT value FROM jsonb_array_elements(p_groups) LOOP
  gid:=(g->>'id')::uuid;
  INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES(gid,g->>'name',g->>'name_en',group_order)
   ON CONFLICT(id) DO UPDATE SET name=excluded.name,name_en=excluded.name_en,sort_order=excluded.sort_order;
  GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Group save failed'; END IF;
  position:=0;
  FOR photo IN SELECT value FROM jsonb_array_elements(g->'photo_ids') LOOP
   UPDATE public.portfolio_projects SET group_id=gid,group_position=position WHERE id=(photo#>>'{}')::uuid;
   GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo assignment failed'; END IF;
   position:=position+1;
  END LOOP;
  group_order:=group_order+1;
 END LOOP;
 RETURN public.studio_portfolio_groups_snapshot();
END $$;
REVOKE ALL ON FUNCTION public.studio_save_portfolio_groups(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studio_save_portfolio_groups(jsonb,jsonb) TO authenticated;

ALTER TABLE public.enquiries ADD COLUMN portfolio_group_id uuid REFERENCES public.portfolio_groups(id) ON DELETE SET NULL,
 ADD COLUMN portfolio_project_id uuid REFERENCES public.portfolio_projects(id) ON DELETE SET NULL;
CREATE POLICY "valid explicit portfolio context" ON public.enquiries AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK((portfolio_group_id IS NULL AND portfolio_project_id IS NULL) OR
  (portfolio_project_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.portfolio_projects p WHERE p.id=portfolio_project_id AND p.is_published AND
   (portfolio_group_id IS NULL OR (p.group_id=portfolio_group_id AND EXISTS(SELECT 1 FROM public.portfolio_groups g WHERE g.id=portfolio_group_id))))));

-- One-time grouping of exactly the 24 existing public photos, inspected visually.
-- Themes do not assert identity, same session, or unverified location.
DO $$
DECLARE gid uuid; written integer;
BEGIN
 LOCK TABLE public.portfolio_groups,public.portfolio_projects IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.portfolio_groups) OR (SELECT count(*) FROM public.portfolio_projects)<>24 OR EXISTS(SELECT 1 FROM public.portfolio_projects WHERE group_id IS NOT NULL OR NOT is_published OR cover_image_url IS NULL OR cover_image_url NOT IN ('/assets/portfolio/motorsport.jpg','/assets/portfolio/ginza-nissan.jpg','/assets/portfolio/halo-detail.jpg','/assets/portfolio/nissan-crossing.jpg','/assets/portfolio/todaiji.jpg','/assets/portfolio/temple-gate.jpg','/assets/portfolio/incense.jpg','/assets/portfolio/pagoda.jpg','/assets/portfolio/gate-tower.jpg','/assets/portfolio/namba-yasaka.jpg','/assets/portfolio/portrait-studio.jpg','/assets/portfolio/editorial-interior.jpg','/assets/portfolio/portrait-low-key.jpg','/assets/portfolio/nara-deer.jpg','/assets/portfolio/night-portrait.jpg','/assets/portfolio/platform.jpg','/assets/portfolio/roadside.jpg','/assets/portfolio/last-train.jpg','/assets/portfolio/documentary.jpg','/assets/portfolio/tokyo-tower.jpg','/assets/portfolio/shibuya.jpg','/assets/portfolio/nightlife-cheers.jpg','/assets/portfolio/nightlife-crew.jpg','/assets/portfolio/itaewon.jpg')) OR (SELECT count(DISTINCT cover_image_url) FROM public.portfolio_projects)<>24 THEN RAISE EXCEPTION 'Portfolio changed; initial grouping aborted without overwriting choices'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('717235d3-146e-5788-aaa1-602f3f1db03e','Formula E','Formula E',0);
 UPDATE public.portfolio_projects SET group_id='717235d3-146e-5788-aaa1-602f3f1db03e',group_position=0 WHERE cover_image_url='/assets/portfolio/motorsport.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='717235d3-146e-5788-aaa1-602f3f1db03e',group_position=1 WHERE cover_image_url='/assets/portfolio/ginza-nissan.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='717235d3-146e-5788-aaa1-602f3f1db03e',group_position=2 WHERE cover_image_url='/assets/portfolio/halo-detail.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='717235d3-146e-5788-aaa1-602f3f1db03e',group_position=3 WHERE cover_image_url='/assets/portfolio/nissan-crossing.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('5959adef-73f6-5b5e-8d64-9c4c37ccd13a','Arquitectura y ritual','Architecture & ritual',1);
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=0 WHERE cover_image_url='/assets/portfolio/todaiji.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=1 WHERE cover_image_url='/assets/portfolio/temple-gate.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=2 WHERE cover_image_url='/assets/portfolio/incense.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=3 WHERE cover_image_url='/assets/portfolio/pagoda.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=4 WHERE cover_image_url='/assets/portfolio/gate-tower.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='5959adef-73f6-5b5e-8d64-9c4c37ccd13a',group_position=5 WHERE cover_image_url='/assets/portfolio/namba-yasaka.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('4c08dc4f-90a8-50cf-b98b-e3871f1097b8','Retratos · camiseta clara','Light-shirt portraits',2);
 UPDATE public.portfolio_projects SET group_id='4c08dc4f-90a8-50cf-b98b-e3871f1097b8',group_position=0 WHERE cover_image_url='/assets/portfolio/portrait-studio.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='4c08dc4f-90a8-50cf-b98b-e3871f1097b8',group_position=1 WHERE cover_image_url='/assets/portfolio/editorial-interior.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='4c08dc4f-90a8-50cf-b98b-e3871f1097b8',group_position=2 WHERE cover_image_url='/assets/portfolio/portrait-low-key.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('ee87e4da-bea7-5eeb-9ca0-ce34f9b39a55','Nara','Nara',3);
 UPDATE public.portfolio_projects SET group_id='ee87e4da-bea7-5eeb-9ca0-ce34f9b39a55',group_position=0 WHERE cover_image_url='/assets/portfolio/nara-deer.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('df5ca3f0-9833-57c4-b9f1-23741390b067','Nightfall','Nightfall',4);
 UPDATE public.portfolio_projects SET group_id='df5ca3f0-9833-57c4-b9f1-23741390b067',group_position=0 WHERE cover_image_url='/assets/portfolio/night-portrait.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('bd52c582-5c92-5578-8cff-18958d06edf6','Máquinas y andenes','Vending machines & platforms',5);
 UPDATE public.portfolio_projects SET group_id='bd52c582-5c92-5578-8cff-18958d06edf6',group_position=0 WHERE cover_image_url='/assets/portfolio/platform.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='bd52c582-5c92-5578-8cff-18958d06edf6',group_position=1 WHERE cover_image_url='/assets/portfolio/roadside.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='bd52c582-5c92-5578-8cff-18958d06edf6',group_position=2 WHERE cover_image_url='/assets/portfolio/last-train.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('731a665f-651c-53ef-98e9-fdd0113c80ff','Sobremesa','Sobremesa',6);
 UPDATE public.portfolio_projects SET group_id='731a665f-651c-53ef-98e9-fdd0113c80ff',group_position=0 WHERE cover_image_url='/assets/portfolio/documentary.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('88fe59aa-0d80-5247-80cf-e13c0c3f05d4','Tokyo Tower','Tokyo Tower',7);
 UPDATE public.portfolio_projects SET group_id='88fe59aa-0d80-5247-80cf-e13c0c3f05d4',group_position=0 WHERE cover_image_url='/assets/portfolio/tokyo-tower.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('60d90e45-9866-576d-8a48-97b9974240dd','Shibuya','Shibuya',8);
 UPDATE public.portfolio_projects SET group_id='60d90e45-9866-576d-8a48-97b9974240dd',group_position=0 WHERE cover_image_url='/assets/portfolio/shibuya.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('acdd1c0e-817c-50de-b4b0-1118ce1f8a1c','Noche con amigos','Night out',9);
 UPDATE public.portfolio_projects SET group_id='acdd1c0e-817c-50de-b4b0-1118ce1f8a1c',group_position=0 WHERE cover_image_url='/assets/portfolio/nightlife-cheers.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 UPDATE public.portfolio_projects SET group_id='acdd1c0e-817c-50de-b4b0-1118ce1f8a1c',group_position=1 WHERE cover_image_url='/assets/portfolio/nightlife-crew.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
 INSERT INTO public.portfolio_groups(id,name,name_en,sort_order) VALUES('393547cc-998f-507b-910a-dc5965d7283a','Itaewon','Itaewon',10);
 UPDATE public.portfolio_projects SET group_id='393547cc-998f-507b-910a-dc5965d7283a',group_position=0 WHERE cover_image_url='/assets/portfolio/itaewon.jpg';
 GET DIAGNOSTICS written=ROW_COUNT; IF written<>1 THEN RAISE EXCEPTION 'Photo changed during grouping'; END IF;
END $$;
