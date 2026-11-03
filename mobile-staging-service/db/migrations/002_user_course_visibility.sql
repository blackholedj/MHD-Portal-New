BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.mobile_course_visibility
  ) THEN
    RAISE EXCEPTION
      'Migrace zastavena: tabulka viditelnosti obsahuje data.';
  END IF;
END;
$$;

ALTER TABLE public.mobile_course_visibility
  ADD COLUMN user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE ns.nspname = 'public'
    AND rel.relname = 'mobile_course_visibility'
    AND con.contype = 'u'
    AND (
      SELECT array_agg(att.attname::text ORDER BY keys.ordinality)
      FROM unnest(con.conkey)
        WITH ORDINALITY AS keys(attnum, ordinality)
      JOIN pg_attribute att
        ON att.attrelid = rel.oid
       AND att.attnum = keys.attnum
    ) = ARRAY[
      'line_number',
      'course_number',
      'transport_type',
      'day_type'
    ];

  IF constraint_name IS NULL THEN
    RAISE EXCEPTION
      'Puvodni UNIQUE omezeni nebylo nalezeno.';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.mobile_course_visibility DROP CONSTRAINT %I',
    constraint_name
  );
END;
$$;

ALTER TABLE public.mobile_course_visibility
  ADD CONSTRAINT mobile_course_visibility_user_course_key
  UNIQUE (
    user_id,
    line_number,
    course_number,
    transport_type,
    day_type
  );

CREATE OR REPLACE FUNCTION public.mobile_can_read_course(
  p_line text,
  p_course text,
  p_transport text,
  p_day text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.status = 'approved'
      AND p.is_blocked = false
      AND (
        p.role = 'admin'
        OR (
          p.role = 'user'
          AND EXISTS (
            SELECT 1
            FROM public.mobile_course_visibility v
            WHERE v.user_id = p.id
              AND v.line_number = p_line
              AND v.course_number = p_course
              AND v.transport_type = p_transport
              AND v.day_type = p_day
          )
        )
      )
  );
$$;

COMMIT;
