-- Preserve the exact five services already rendered publicly by release 0c66e7b.
-- Source: assets/default-copy.js labels; assets/service-catalog.js descriptions/images/UUIDs.
-- Read-only live snapshot 2026-11-02: no serviceCatalog, serviceList or serviceBlurbs rows.
-- No owner impersonation, RPC invocation, new offerings, publication changes or policy changes.
-- Tracked one-time migration; abort if any source row appeared since review. Never use as reset.
DO $$
DECLARE written integer;
BEGIN
  PERFORM pg_advisory_xact_lock(1836020325,1);
  LOCK TABLE public.site_content IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key IN ('serviceCatalog','serviceList','serviceBlurbs')) THEN
    RAISE EXCEPTION 'Service source changed or canonical catalog exists; preservation seed aborted';
  END IF;
  INSERT INTO public.site_content(key,lang,value) VALUES
    ('serviceCatalog', 'es', '{"version":1,"legacyIds":["10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000002","10000000-0000-4000-8000-000000000003","10000000-0000-4000-8000-000000000004","10000000-0000-4000-8000-000000000005"],"items":[{"id":"10000000-0000-4000-8000-000000000001","labels":{"es":"Fotografía","en":"Photography"},"descriptions":{"es":"Fotografía para marcas, espacios, producto y personas. En localización o en estudio, con selección y retoque.","en":"Stills for brands, venues, products and people. Shot on location or in a studio, selected and retouched."},"image":"assets/portfolio/portrait-studio.jpg","active":true},{"id":"10000000-0000-4000-8000-000000000002","labels":{"es":"Vídeo y reels","en":"Film & Reels"},"descriptions":{"es":"Imagen en movimiento: piezas cortas, reels verticales y versiones para redes. Del rodaje al montaje, color y sonido.","en":"Moving image: short films, vertical reels and cutdowns for social. From shoot through to edit, colour and sound."},"image":"assets/portfolio/halo-detail.jpg","active":true},{"id":"10000000-0000-4000-8000-000000000003","labels":{"es":"UGC","en":"UGC"},"descriptions":{"es":"Contenido con estilo de creador que no desentona en el feed — pensado para que tu audiencia se detenga a mirarlo, para marcas que necesitan material cotidiano.","en":"Creator-style content that looks native in the feed — made to stop the scroll, for brands that need a steady stream of everyday material."},"image":"assets/portfolio/nightlife-cheers.jpg","active":true},{"id":"10000000-0000-4000-8000-000000000004","labels":{"es":"Eventos","en":"Events"},"descriptions":{"es":"Cobertura de eventos, presentaciones y fiestas: el espacio, la gente y lo que pasa, mientras ocurre.","en":"Coverage of events, launches and parties — the room, the people and the moments, as they happen."},"image":"assets/portfolio/nightlife-crew.jpg","active":true},{"id":"10000000-0000-4000-8000-000000000005","labels":{"es":"Contenido para redes","en":"Social Content"},"descriptions":{"es":"Contenido continuado para redes: un ritmo recurrente de rodaje y edición en lugar de piezas sueltas.","en":"Ongoing content for social channels: a recurring shoot and edit rhythm instead of one-off assets."},"image":"assets/portfolio/shibuya.jpg","active":true}]}'),
    ('serviceList', 'es', '["Fotografía","Vídeo y reels","UGC","Eventos","Contenido para redes"]'),
    ('serviceList', 'en', '["Photography","Film & Reels","UGC","Events","Social Content"]');
  GET DIAGNOSTICS written = ROW_COUNT;
  IF written <> 3 THEN RAISE EXCEPTION 'Incomplete service catalog preservation'; END IF;
END;
$$;
