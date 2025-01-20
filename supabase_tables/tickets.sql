-- ===========================================
-- TABLE: tickets
-- PK: id (uuid)
-- RLS: customers see their own, agents see assigned or team, admins see all
-- ===========================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  team_id     uuid REFERENCES public.teams (id) ON DELETE SET NULL,
  subject     text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open','pending','resolved','closed')),
  priority    text NOT NULL DEFAULT 'low' 
    CHECK (priority IN ('low','medium','high','urgent')),
  channel     text NOT NULL DEFAULT 'web' 
    CHECK (channel IN ('web','email','chat','social','sms','phone')),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp_tickets
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();

-- ===========================================
-- RLS Policies
-- ===========================================

CREATE POLICY tickets_customer_select_own
ON public.tickets
FOR SELECT
USING (
  auth.uid() = created_by
  AND EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'customer'
  )
);

CREATE POLICY tickets_customer_update_own
ON public.tickets
FOR UPDATE
USING (
  auth.uid() = created_by
  AND EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'customer'
  )
)
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'customer'
  )
);

CREATE POLICY tickets_agent_select_assigned
ON public.tickets
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'agent'
  )
  AND (
    assigned_to = auth.uid()
    OR team_id IN (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
    )
  )
);

CREATE POLICY tickets_agent_update_assigned
ON public.tickets
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'agent'
  )
  AND (
    assigned_to = auth.uid()
    OR team_id IN (
      SELECT tm.team_id
      FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  assigned_to = auth.uid()
  OR team_id IN (
    SELECT tm.team_id
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
  )
);

CREATE POLICY tickets_admin_select_all
ON public.tickets
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  )
);

CREATE POLICY tickets_admin_update_all
ON public.tickets
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
  )
);