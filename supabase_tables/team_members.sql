-- ===========================================
-- TABLE: team_members
-- PK: id (uuid)
-- RLS: typically controlled by admins or team managers
-- ===========================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role    text NOT NULL DEFAULT 'member'
    CHECK (role IN ('manager','member')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Example policies:

-- Possibly everyone can read (so agents know their team assignments).
CREATE POLICY team_members_select_all
ON public.team_members
FOR SELECT
USING ( true );

-- Admin can do anything:
CREATE POLICY team_members_admin_all
ON public.team_members
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'manager'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Optional: Trigger
CREATE TRIGGER update_timestamp_team_members
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
