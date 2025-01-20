-- ===========================================
-- TABLE: knowledge_base_articles
-- PK: id (uuid)
-- RLS: read by all or all authenticated, updated by agents
-- ===========================================
CREATE TABLE IF NOT EXISTS public.knowledge_base_articles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  content    text NOT NULL,  -- could be markdown, HTML, etc.
  tags       text[],
  language   text NOT NULL DEFAULT 'en',
  created_by uuid NOT NULL REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: anyone can SELECT (or restrict to authenticated users if needed)
CREATE POLICY kb_articles_read_all
ON public.knowledge_base_articles
FOR SELECT
USING ( true );

-- Policy: authenticated users with the "agent" role can INSERT articles
CREATE POLICY kb_articles_agent_insert
ON public.knowledge_base_articles
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
  AND created_by = auth.uid()
);

-- Policy: agents can UPDATE articles they created
CREATE POLICY kb_articles_agent_update_own
ON public.knowledge_base_articles
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

-- Policy: agents with "admin" privileges can UPDATE any article
CREATE POLICY kb_articles_admin_update_all
ON public.knowledge_base_articles
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

CREATE TRIGGER update_timestamp_kb_articles
BEFORE UPDATE ON public.knowledge_base_articles
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
