-- ===========================================
-- TABLE: ticket_feedback
-- PK: id (uuid)
-- RLS: typically only the customer who created the ticket can insert
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ticket_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  rating     int CHECK (rating >= 1 AND rating <= 5),
  feedback   text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_feedback ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: only the creator of the ticket can INSERT feedback
CREATE POLICY ticket_feedback_insert
ON public.ticket_feedback
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_feedback.ticket_id
      AND t.created_by = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Policy: only the creator of the feedback can UPDATE it
CREATE POLICY ticket_feedback_update
ON public.ticket_feedback
FOR UPDATE
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

-- Policy: SELECT if the user can see the ticket
CREATE POLICY ticket_feedback_select
ON public.ticket_feedback
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_feedback.ticket_id
      AND (
        t.created_by = auth.uid()  -- customer
        OR t.assigned_to = auth.uid() -- assigned agent
        OR t.team_id IN (
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

CREATE TRIGGER update_timestamp_ticket_feedback
BEFORE UPDATE ON public.ticket_feedback
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
