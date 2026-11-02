-- Reviewed, manual quote -> booking connection. No new tables, policies or model calls.
-- Run as a tracked migration after review; this file does not modify existing rows.
-- Existing table RLS remains authoritative: SECURITY INVOKER never bypasses it.
CREATE FUNCTION public.studio_link_quote_booking(
  p_quote_id uuid,
  p_expected_client_id uuid,
  p_existing_project_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_event_date date DEFAULT NULL,
  p_service text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  q public.quotes%ROWTYPE;
  target public.projects%ROWTYPE;
  result_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- A quote is the idempotency key. Concurrent/retried submissions serialize here.
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote unavailable'; END IF;
  IF q.status IS DISTINCT FROM 'accepted' OR q.client_id IS NULL THEN
    RAISE EXCEPTION 'An accepted quote with a client is required';
  END IF;

  IF q.client_id IS DISTINCT FROM p_expected_client_id THEN
    RAISE EXCEPTION 'Quote client changed; review the quote again';
  END IF;

  -- Lock order: quote -> client -> booking. Concurrent deletion cannot orphan the link.
  PERFORM id FROM public.clients WHERE id = q.client_id FOR KEY SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client unavailable'; END IF;

  IF q.project_id IS NOT NULL THEN
    IF p_existing_project_id IS NOT NULL AND p_existing_project_id <> q.project_id THEN
      RAISE EXCEPTION 'Quote already linked';
    END IF;
    SELECT * INTO target FROM public.projects WHERE id = q.project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked booking unavailable'; END IF;
    IF target.client_id IS DISTINCT FROM q.client_id THEN
      RAISE EXCEPTION 'Linked booking belongs to a different client';
    END IF;
    -- A replay may return a cancelled booking; it never reopens it or creates a duplicate.
    RETURN target.id;
  END IF;

  IF p_existing_project_id IS NOT NULL THEN
    SELECT * INTO target FROM public.projects WHERE id = p_existing_project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Booking unavailable'; END IF;
    IF target.client_id IS DISTINCT FROM q.client_id OR target.status = 'cancelled' THEN
      RAISE EXCEPTION 'Choose an active booking for the same client';
    END IF;
    result_id := target.id;
  ELSE
    IF nullif(btrim(p_title), '') IS NULL OR char_length(p_title) > 200
       OR char_length(p_service) > 200 OR char_length(p_notes) > 5000 THEN
      RAISE EXCEPTION 'Invalid booking details';
    END IF;
    INSERT INTO public.projects (client_id, title, service, event_date, notes, status)
    VALUES (q.client_id, btrim(p_title), nullif(btrim(p_service), ''), p_event_date,
            nullif(btrim(p_notes), ''), 'enquiry')
    RETURNING id INTO result_id;
  END IF;

  -- No amount, quote status or booking confirmation is changed. Any failure rolls back the insert.
  UPDATE public.quotes SET project_id = result_id WHERE id = q.id
  RETURNING project_id INTO result_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote link could not be saved'; END IF;
  RETURN result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.studio_link_quote_booking(uuid, uuid, uuid, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_link_quote_booking(uuid, uuid, uuid, text, date, text, text) TO authenticated;
COMMENT ON FUNCTION public.studio_link_quote_booking(uuid, uuid, uuid, text, date, text, text)
IS 'Manual reviewed connection of an accepted quote to a same-client booking. SECURITY INVOKER; quote/client/booking locks; replay-safe. Preserves amounts/status and never sends, charges or confirms.';
