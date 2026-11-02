-- Atomic manual service-catalog CAS. Does not seed public content or alter existing policies.
CREATE FUNCTION public.studio_save_service_catalog(p_expected jsonb, p_catalog jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  actual jsonb := '[]'::jsonb;
  existing_catalog text;
  row_record record;
  item jsonb;
  locale text;
  identifier uuid;
  seen uuid[] := ARRAY[]::uuid[];
  legacy_seen uuid[] := ARRAY[]::uuid[];
  legacy_value jsonb;
  image text;
  port_text text;
  es_labels jsonb := '[]'::jsonb;
  en_labels jsonb := '[]'::jsonb;
  catalog_text text;
  es_text text;
  en_text text;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  -- Serializes initial creation as well as updates; row locks protect existing values.
  PERFORM pg_advisory_xact_lock(1836020325, 1);
  FOR row_record IN SELECT key, lang, value FROM public.site_content
    WHERE (key = 'serviceCatalog' AND lang = 'es') OR (key = 'serviceList' AND lang IN ('es', 'en'))
    ORDER BY key, lang FOR UPDATE
  LOOP
    actual := actual || jsonb_build_array(jsonb_build_object('key', row_record.key, 'lang', row_record.lang, 'value', row_record.value));
    IF row_record.key = 'serviceCatalog' THEN existing_catalog := row_record.value; END IF;
  END LOOP;
  IF actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'Service catalog changed; reload and review your draft';
  END IF;
  IF jsonb_typeof(p_catalog) IS DISTINCT FROM 'object'
     OR p_catalog->'version' IS DISTINCT FROM '1'::jsonb
     OR jsonb_typeof(p_catalog->'items') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_catalog->'legacyIds') IS DISTINCT FROM 'array'
     OR (p_catalog - ARRAY['version', 'items', 'legacyIds']) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid service catalog';
  END IF;
  IF jsonb_array_length(p_catalog->'items') > 100 THEN RAISE EXCEPTION 'Too many services'; END IF;
  IF jsonb_array_length(p_catalog->'legacyIds') > 100 THEN RAISE EXCEPTION 'Too many legacy links'; END IF;
  FOR legacy_value IN SELECT value FROM jsonb_array_elements(p_catalog->'legacyIds') LOOP
    IF jsonb_typeof(legacy_value) IS DISTINCT FROM 'string' OR (legacy_value #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid legacy service ID'; END IF;
    identifier := (legacy_value #>> '{}')::uuid;
    IF identifier = ANY(legacy_seen) THEN RAISE EXCEPTION 'Duplicate legacy service ID'; END IF;
    legacy_seen := array_append(legacy_seen, identifier);
  END LOOP;
  IF existing_catalog IS NOT NULL AND existing_catalog::jsonb->'legacyIds' IS DISTINCT FROM p_catalog->'legacyIds' THEN
    RAISE EXCEPTION 'Legacy service links cannot be reassigned';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_catalog->'items') LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
       OR (item - ARRAY['id','labels','descriptions','image','active']) <> '{}'::jsonb
       OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item->'labels') IS DISTINCT FROM 'object'
       OR jsonb_typeof(item->'descriptions') IS DISTINCT FROM 'object'
       OR jsonb_typeof(item->'active') IS DISTINCT FROM 'boolean'
       OR jsonb_typeof(item->'image') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Invalid service entry';
    END IF;
    IF (item->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid service ID'; END IF;
    identifier := (item->>'id')::uuid;
    IF identifier = ANY(seen) THEN RAISE EXCEPTION 'Duplicate service ID'; END IF;
    seen := array_append(seen, identifier);
    IF ((item->'labels') - ARRAY['es','en']) <> '{}'::jsonb
       OR ((item->'descriptions') - ARRAY['es','en']) <> '{}'::jsonb THEN RAISE EXCEPTION 'Invalid service locales'; END IF;
    FOREACH locale IN ARRAY ARRAY['es','en'] LOOP
      IF jsonb_typeof(item->'labels'->locale) IS DISTINCT FROM 'string'
         OR (item->'labels'->>locale) ~ '[[:cntrl:]]'
         OR char_length(item->'labels'->>locale) NOT BETWEEN 1 AND 120
         OR nullif(btrim(item->'labels'->>locale, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') IS NULL
         OR jsonb_typeof(item->'descriptions'->locale) IS DISTINCT FROM 'string'
         OR char_length(item->'descriptions'->>locale) > 5000 THEN
        RAISE EXCEPTION 'Invalid service label or description';
      END IF;
    END LOOP;
    image := item->>'image';
    IF image ~ '[[:cntrl:][:space:]<>"''\\]' OR image ~* '%([01][0-9a-f]|7f|5c)' THEN RAISE EXCEPTION 'Unsafe service image'; END IF;
    IF NOT (image ~ '^/?assets/[a-zA-Z0-9/_.,+()-]+$' AND image !~ '(^|/)\.\.?(/|$)')
       AND NOT (image ~* '^https://[a-z0-9.-]+(:[0-9]+)?([/?#][^[:space:]<>"'']*)?$') THEN
      RAISE EXCEPTION 'Image must be an assets path or a secure URL without credentials';
    END IF;
    port_text := substring(lower(image) from '^https://[a-z0-9.-]+:([0-9]+)');
    IF port_text IS NOT NULL AND (char_length(port_text) > 5 OR port_text::numeric NOT BETWEEN 1 AND 65535) THEN
      RAISE EXCEPTION 'Invalid HTTPS image port';
    END IF;
    IF (item->>'active')::boolean THEN
      es_labels := es_labels || jsonb_build_array(item->'labels'->>'es');
      en_labels := en_labels || jsonb_build_array(item->'labels'->>'en');
    END IF;
  END LOOP;
  catalog_text := p_catalog::text; es_text := es_labels::text; en_text := en_labels::text;
  INSERT INTO public.site_content(key, lang, value) VALUES
    ('serviceCatalog', 'es', catalog_text), ('serviceList', 'es', es_text), ('serviceList', 'en', en_text)
  ON CONFLICT (key, lang) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  SELECT jsonb_agg(jsonb_build_object('key', key, 'lang', lang, 'value', value) ORDER BY key, lang) INTO actual
  FROM public.site_content WHERE (key = 'serviceCatalog' AND lang = 'es') OR (key = 'serviceList' AND lang IN ('es','en'));
  RETURN actual;
END;
$$;
REVOKE ALL ON FUNCTION public.studio_save_service_catalog(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_save_service_catalog(jsonb, jsonb) TO authenticated;
COMMENT ON FUNCTION public.studio_save_service_catalog(jsonb, jsonb)
IS 'Owner-only SECURITY INVOKER atomic compare-and-save for canonical services and compatibility labels. No seed, model, public permission or historical record changes.';
