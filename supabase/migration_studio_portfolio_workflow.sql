-- Private provenance for existing portfolio pieces. This never publishes or copies private CRM data.
CREATE TABLE public.portfolio_workflows (
  portfolio_project_id uuid PRIMARY KEY REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL DEFAULT auth.uid()
);
CREATE INDEX portfolio_workflows_project_id_idx ON public.portfolio_workflows(project_id);
ALTER TABLE public.portfolio_workflows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_workflows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.portfolio_workflows TO authenticated;
CREATE POLICY portfolio_workflows_admin_read ON public.portfolio_workflows FOR SELECT TO authenticated
  USING (coalesce(public.is_admin(), false));
CREATE POLICY portfolio_workflows_admin_insert ON public.portfolio_workflows FOR INSERT TO authenticated
  WITH CHECK (coalesce(public.is_admin(), false) AND created_by = auth.uid());

CREATE FUNCTION public.studio_link_portfolio_booking(
  p_portfolio_id uuid, p_expected_portfolio jsonb,
  p_project_id uuid, p_expected_project jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  booking public.projects%ROWTYPE;
  piece public.portfolio_projects%ROWTYPE;
  prior public.portfolio_workflows%ROWTYPE;
  inserted_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO booking FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking unavailable'; END IF;
  SELECT * INTO piece FROM public.portfolio_projects WHERE id = p_portfolio_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portfolio piece unavailable'; END IF;
  IF jsonb_build_object('client_id',booking.client_id,'title',booking.title,'event_date',booking.event_date,'status',booking.status)
     IS DISTINCT FROM p_expected_project THEN RAISE EXCEPTION 'Booking changed; review again'; END IF;
  IF jsonb_build_object('title',piece.title,'cover_image_url',piece.cover_image_url,'is_published',piece.is_published,'status',piece.status)
     IS DISTINCT FROM p_expected_portfolio THEN RAISE EXCEPTION 'Portfolio piece changed; review again'; END IF;
  SELECT * INTO prior FROM public.portfolio_workflows WHERE portfolio_project_id = piece.id;
  IF FOUND THEN
    IF prior.project_id IS NULL THEN RAISE EXCEPTION 'Origin booking was deleted; review manually'; END IF;
    IF prior.project_id <> booking.id THEN RAISE EXCEPTION 'Portfolio piece already has another origin'; END IF;
    RETURN jsonb_build_object('portfolio_project_id',piece.id,'project_id',booking.id,'reused',true);
  END IF;
  IF booking.status = 'cancelled' THEN RAISE EXCEPTION 'Choose a non-cancelled booking'; END IF;
  INSERT INTO public.portfolio_workflows(portfolio_project_id,project_id,created_by)
  VALUES(piece.id,booking.id,auth.uid()) RETURNING portfolio_project_id INTO inserted_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portfolio connection could not be saved'; END IF;
  RETURN jsonb_build_object('portfolio_project_id',piece.id,'project_id',booking.id,'reused',false);
END;
$$;
REVOKE ALL ON FUNCTION public.studio_link_portfolio_booking(uuid,jsonb,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.studio_link_portfolio_booking(uuid,jsonb,uuid,jsonb) TO authenticated;
COMMENT ON TABLE public.portfolio_workflows IS 'Private origin links only. No private notes/client details exposed through public portfolio.';
COMMENT ON FUNCTION public.studio_link_portfolio_booking(uuid,jsonb,uuid,jsonb)
IS 'Manual reviewed origin link. Invoker RLS, booking/portfolio locks, snapshot checks, idempotent. Never changes portfolio publication, images, titles or private booking data.';
