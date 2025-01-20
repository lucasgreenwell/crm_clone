-- ===========================================
-- TABLE: tags
-- PK: id (uuid)
-- Tags for categorizing or sorting tickets
-- ===========================================
CREATE TABLE IF NOT EXISTS public.tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: anyone can SELECT tags
CREATE POLICY tags_select
ON public.tags
FOR SELECT
USING ( true );

-- Policy: authenticated users with the "admin" role can INSERT tags
CREATE POLICY tags_insert
ON public.tags
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: authenticated users with the "admin" role can UPDATE tags
CREATE POLICY tags_update
ON public.tags
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: authenticated users with the "admin" role can DELETE tags
CREATE POLICY tags_delete
ON public.tags
FOR DELETE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

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

CREATE TRIGGER update_timestamp_tags
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
