-- ===========================================
-- TABLE: ticket_tags (many-to-many link between tickets and tags)
-- PK: id (uuid)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ticket_tags (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES public.tags (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: user can SELECT if they can see the parent ticket
CREATE POLICY ticket_tags_select
ON public.ticket_tags
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_tags.ticket_id
      AND (
        t.created_by = auth.uid()  -- Customer
        OR t.assigned_to = auth.uid() -- Assigned agent
        OR t.team_id IN ( -- Team members
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
      )
  )
);

-- Policy: user can INSERT if they can UPDATE the parent ticket
CREATE POLICY ticket_tags_insert
ON public.ticket_tags
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_tags.ticket_id
      AND (
        t.assigned_to = auth.uid() -- Assigned agent
        OR t.team_id IN ( -- Team members
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
      )
  )
);

-- Policy: user can DELETE if they can UPDATE the parent ticket
CREATE POLICY ticket_tags_delete
ON public.ticket_tags
FOR DELETE
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_tags.ticket_id
      AND (
        t.assigned_to = auth.uid() -- Assigned agent
        OR t.team_id IN ( -- Team members
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
      )
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

CREATE TRIGGER update_timestamp_ticket_tags
BEFORE UPDATE ON public.ticket_tags
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
