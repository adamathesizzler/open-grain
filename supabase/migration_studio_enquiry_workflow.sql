-- Private provenance only. Public enquiry INSERT policy and existing CRM RLS are untouched.
CREATE TABLE public.enquiry_workflows (
  enquiry_id uuid PRIMARY KEY REFERENCES public.enquiries(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);
CREATE INDEX enquiry_workflows_client_id_idx ON public.enquiry_workflows(client_id);
CREATE INDEX enquiry_workflows_project_id_idx ON public.enquiry_workflows(project_id);
ALTER TABLE public.enquiry_workflows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enquiry_workflows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.enquiry_workflows TO authenticated;
CREATE POLICY enquiry_workflows_admin_read ON public.enquiry_workflows
  FOR SELECT TO authenticated USING (coalesce(public.is_admin(), false));
CREATE POLICY enquiry_workflows_admin_insert ON public.enquiry_workflows
  FOR INSERT TO authenticated WITH CHECK (coalesce(public.is_admin(), false) AND created_by = auth.uid());

CREATE FUNCTION public.studio_start_enquiry_workflow(
  p_enquiry_id uuid,
  p_expected_source jsonb,
  p_existing_client_id uuid DEFAULT NULL,
  p_create_client boolean DEFAULT false,
  p_existing_project_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  source public.enquiries%ROWTYPE;
  prior public.enquiry_workflows%ROWTYPE;
  booking public.projects%ROWTYPE;
  snapshot jsonb;
  expected_snapshot jsonb;
  result_client uuid;
  result_project uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_expected_source IS NULL OR jsonb_typeof(p_expected_source) <> 'object' THEN
    RAISE EXCEPTION 'A reviewed source object is required';
  END IF;
  -- The source row is the unique workflow key. Retries never silently recreate deleted records.
  SELECT * INTO source FROM public.enquiries WHERE id = p_enquiry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enquiry unavailable'; END IF;
  snapshot := jsonb_build_object(
    'name', source.name, 'email', source.email, 'phone', source.phone,
    'service', source.service, 'preferred_date', source.preferred_date,
    'budget_range', source.budget_range, 'message', source.message,
    'consent_accepted', source.consent_accepted, 'consent_at', source.consent_at
  );
  -- Normalize timestamp offsets (+00:00 vs Z) without weakening consent comparison.
  expected_snapshot := p_expected_source || jsonb_build_object('consent_at', (p_expected_source->>'consent_at')::timestamptz);
  IF snapshot IS DISTINCT FROM expected_snapshot THEN
    RAISE EXCEPTION 'Enquiry changed; review its details again';
  END IF;
  IF source.consent_accepted IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Accepted enquiry consent is required';
  END IF;
  IF p_existing_client_id IS NOT NULL AND p_create_client THEN
    RAISE EXCEPTION 'Choose either an existing or a new client';
  END IF;

  SELECT * INTO prior FROM public.enquiry_workflows WHERE enquiry_id = source.id;
  IF FOUND THEN
    IF prior.client_id IS NULL OR prior.project_id IS NULL THEN
      RAISE EXCEPTION 'Linked records were removed; review the enquiry manually';
    END IF;
    IF (p_existing_client_id IS NOT NULL AND p_existing_client_id <> prior.client_id)
       OR (p_existing_project_id IS NOT NULL AND p_existing_project_id <> prior.project_id) THEN
      RAISE EXCEPTION 'Enquiry already connected to different records';
    END IF;
    PERFORM id FROM public.clients WHERE id = prior.client_id FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked client unavailable'; END IF;
    SELECT * INTO booking FROM public.projects WHERE id = prior.project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Linked booking unavailable'; END IF;
    IF booking.client_id IS DISTINCT FROM prior.client_id THEN
      RAISE EXCEPTION 'Linked booking belongs to a different client';
    END IF;
    RETURN jsonb_build_object('client_id', prior.client_id, 'project_id', prior.project_id, 'reused', true);
  END IF;

  IF p_existing_client_id IS NOT NULL THEN
    PERFORM id FROM public.clients WHERE id = p_existing_client_id FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client unavailable'; END IF;
    result_client := p_existing_client_id;
  ELSIF p_create_client IS TRUE THEN
    IF nullif(btrim(source.name), '') IS NULL THEN RAISE EXCEPTION 'Client name is required'; END IF;
    INSERT INTO public.clients(name, email, phone)
    VALUES (source.name, source.email, source.phone) RETURNING id INTO result_client;
  ELSE
    RAISE EXCEPTION 'Explicitly choose an existing client or create a new one';
  END IF;

  IF p_existing_project_id IS NOT NULL THEN
    SELECT * INTO booking FROM public.projects WHERE id = p_existing_project_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Booking unavailable'; END IF;
    IF booking.client_id IS DISTINCT FROM result_client OR booking.status = 'cancelled' THEN
      RAISE EXCEPTION 'Choose an active booking for the same client';
    END IF;
    result_project := booking.id;
  ELSE
    IF nullif(btrim(p_title), '') IS NULL OR char_length(p_title) > 200 THEN
      RAISE EXCEPTION 'A booking title of 1 to 200 characters is required';
    END IF;
    INSERT INTO public.projects(client_id, title, service, event_date, budget_range, notes, status)
    VALUES (result_client, btrim(p_title), source.service, source.preferred_date,
            source.budget_range, source.message, 'enquiry') RETURNING id INTO result_project;
  END IF;

  INSERT INTO public.enquiry_workflows(enquiry_id, client_id, project_id, created_by)
  VALUES (source.id, result_client, result_project, auth.uid());
  RETURN jsonb_build_object('client_id', result_client, 'project_id', result_project, 'reused', false);
END;
$$;
REVOKE ALL ON FUNCTION public.studio_start_enquiry_workflow(uuid, jsonb, uuid, boolean, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.studio_start_enquiry_workflow(uuid, jsonb, uuid, boolean, uuid, text) TO authenticated;
COMMENT ON TABLE public.enquiry_workflows IS 'Private reviewed enquiry-to-CRM provenance. Null links are deletion tombstones, not permission to recreate records.';
COMMENT ON FUNCTION public.studio_start_enquiry_workflow(uuid, jsonb, uuid, boolean, uuid, text)
IS 'Manual consent-preserving workflow. No automatic merge, enquiry status change, quote, message, payment or AI. Source/client/booking locks; atomic and replay-safe.';
