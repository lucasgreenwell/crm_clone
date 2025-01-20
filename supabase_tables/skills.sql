-- ===========================================
-- TABLE: skills
-- PK: id (uuid)
-- RLS: typically admin-managed
-- ===========================================
CREATE TABLE IF NOT EXISTS public.skills (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name  text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY skills_select
ON public.skills
FOR SELECT
USING ( true );

CREATE POLICY skills_admin_all
ON public.skills
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

CREATE TRIGGER update_timestamp_skills
BEFORE UPDATE ON public.skills
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
