-- Prepared locally. Apply to a reviewed test environment before production.
-- Historical convention: course_number = actual line, line_number = actual course.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.jizdni_rady IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE public.timetable_course_visibility (
  line_number text NOT NULL,
  course_number text NOT NULL,
  transport_type text NOT NULL,
  day_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (line_number, course_number, transport_type, day_type)
);
ALTER TABLE public.timetable_course_visibility ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.timetable_course_visibility FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.timetable_course_visibility TO authenticated;
CREATE POLICY timetable_visibility_admin_read ON public.timetable_course_visibility
  FOR SELECT TO authenticated USING ((SELECT public.is_portal_admin()));

CREATE FUNCTION public.can_read_timetable_course(
  p_line_number text, p_course_number text, p_transport_type text, p_day_type text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_portal_admin() OR (
    public.is_portal_member() AND COALESCE((
      SELECT v.is_active FROM public.timetable_course_visibility v
      WHERE v.line_number = p_line_number AND v.course_number = p_course_number
        AND v.transport_type = p_transport_type AND v.day_type = p_day_type
    ), true)
  );
$$;
REVOKE ALL ON FUNCTION public.can_read_timetable_course(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_timetable_course(text,text,text,text) TO anon, authenticated;

-- Restrictive: existing membership/role policies still apply unchanged.
CREATE POLICY jizdni_rady_course_visibility ON public.jizdni_rady AS RESTRICTIVE
  FOR SELECT TO PUBLIC USING (public.can_read_timetable_course(
    line_number, course_number, transport_type, day_type
  ));

CREATE FUNCTION public.set_timetable_course_visibility(
  p_line_number text, p_course_number text, p_transport_type text, p_day_type text,
  p_is_active boolean, p_expected_active boolean
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_active boolean;
BEGIN
  IF public.is_portal_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF p_is_active IS NULL OR p_expected_active IS NULL THEN
    RAISE EXCEPTION 'Visibility is required' USING ERRCODE = '22023';
  END IF;
  -- Same lock as existing save/delete RPCs: prevents a rename/delete race.
  LOCK TABLE public.jizdni_rady IN SHARE ROW EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT 1 FROM public.jizdni_rady r
    WHERE r.line_number = p_line_number AND r.course_number = p_course_number
      AND r.transport_type = p_transport_type AND r.day_type = p_day_type) THEN
    RAISE EXCEPTION 'Course no longer exists' USING ERRCODE = '40001';
  END IF;
  SELECT v.is_active INTO current_active FROM public.timetable_course_visibility v
    WHERE v.line_number = p_line_number AND v.course_number = p_course_number
      AND v.transport_type = p_transport_type AND v.day_type = p_day_type;
  IF COALESCE(current_active, true) IS DISTINCT FROM p_expected_active THEN
    RAISE EXCEPTION 'Visibility changed; refresh first' USING ERRCODE = '40001';
  END IF;
  INSERT INTO public.timetable_course_visibility
    (line_number,course_number,transport_type,day_type,is_active)
  VALUES (p_line_number,p_course_number,p_transport_type,p_day_type,p_is_active)
  ON CONFLICT (line_number,course_number,transport_type,day_type)
    DO UPDATE SET is_active = EXCLUDED.is_active;
END;
$$;
REVOKE ALL ON FUNCTION public.set_timetable_course_visibility(text,text,text,text,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_timetable_course_visibility(text,text,text,text,boolean,boolean) TO authenticated;

-- Preserve visibility if an administrator renames/moves an existing course.
-- A destination with an explicit visibility setting retains that setting.
CREATE FUNCTION public.preserve_timetable_course_visibility() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF ROW(OLD.line_number,OLD.course_number,OLD.transport_type,OLD.day_type)
    IS DISTINCT FROM ROW(NEW.line_number,NEW.course_number,NEW.transport_type,NEW.day_type) THEN
    INSERT INTO public.timetable_course_visibility
      (line_number,course_number,transport_type,day_type,is_active)
    SELECT NEW.line_number,NEW.course_number,NEW.transport_type,NEW.day_type,v.is_active
      FROM public.timetable_course_visibility v
      WHERE v.line_number = OLD.line_number AND v.course_number = OLD.course_number
        AND v.transport_type = OLD.transport_type AND v.day_type = OLD.day_type
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.preserve_timetable_course_visibility() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER preserve_timetable_course_visibility
  BEFORE UPDATE OF line_number,course_number,transport_type,day_type ON public.jizdni_rady
  FOR EACH ROW EXECUTE FUNCTION public.preserve_timetable_course_visibility();
NOTIFY pgrst, 'reload schema';
COMMIT;
