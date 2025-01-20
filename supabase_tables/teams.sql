-- ===========================================
-- TABLE: teams
-- PK: id (uuid)
-- RLS: read by all, modified by admins, etc.
-- ===========================================
CREATE TABLE IF NOT EXISTS public.teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  focus_area text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Example policies:

-- Everyone can read teams (if desired):
CREATE POLICY teams_select_all
ON public.teams
FOR SELECT
USING ( true );

-- Admin can manage (insert, update, delete) teams:
CREATE POLICY teams_admin_all
ON public.teams
FOR ALL
USING ( EXISTS (
  SELECT 1 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
    AND role = 'admin'
) )
WITH CHECK ( EXISTS (
  SELECT 1 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
    AND role = 'admin'
) );

-- Optional: Trigger to keep updated_at current
CREATE TRIGGER update_timestamp_teams
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
