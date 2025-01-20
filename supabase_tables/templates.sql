-- ===========================================
-- TABLE: templates
-- PK: id (uuid)
-- Stored quick-response templates
-- ===========================================
CREATE TABLE IF NOT EXISTS public.templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  content     text NOT NULL, -- The stored template text
  created_by  uuid NOT NULL REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: authenticated users with the "agent" role can INSERT templates
CREATE POLICY templates_insert
ON public.templates
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
  AND created_by = auth.uid()
);

-- Policy: authenticated users with the "agent" role can SELECT templates
CREATE POLICY templates_select
ON public.templates
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
);

-- Policy: agents can UPDATE templates they created
CREATE POLICY templates_update_own
ON public.templates
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
  AND created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- Policy: agents with the "admin" role can UPDATE all templates
CREATE POLICY templates_update_all
ON public.templates
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK ( true );

-- ===========================================
-- Trigger for updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp_templates
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
