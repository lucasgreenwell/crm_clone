-- ===========================================
-- TABLE: ticket_messages
-- PK: id (uuid)
-- RLS: check parent ticket visibility
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES public.tickets (id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users (id),
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: SELECT if user can see the parent ticket
CREATE POLICY ticket_messages_select
ON public.ticket_messages
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (
        t.created_by = auth.uid()  -- customer
        OR t.assigned_to = auth.uid() -- assigned agent
        OR t.team_id IN (
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
        OR (EXISTS(
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        ))
      )
  )
);

-- Policy: INSERT if user can see the parent ticket
CREATE POLICY ticket_messages_insert
ON public.ticket_messages
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR t.team_id IN (
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
        OR (EXISTS(
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        ))
      )
  )
  AND sender_id = auth.uid()
);

-- Policy: UPDATE if user can see the parent ticket and is the sender
CREATE POLICY ticket_messages_update
ON public.ticket_messages
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR t.team_id IN (
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
        OR (EXISTS(
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        ))
      )
  )
)
WITH CHECK (
  sender_id = auth.uid()
);

-- Policy: DELETE if user can see the parent ticket and is the sender
CREATE POLICY ticket_messages_delete
ON public.ticket_messages
FOR DELETE
USING (
  EXISTS(
    SELECT 1
    FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (
        t.created_by = auth.uid()
        OR t.assigned_to = auth.uid()
        OR t.team_id IN (
          SELECT tm.team_id
          FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
        )
        OR (EXISTS(
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid() AND p.role = 'admin'
        ))
      )
  )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp_ticket_messages
BEFORE UPDATE ON public.ticket_messages
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
