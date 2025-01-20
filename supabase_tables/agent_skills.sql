-- ===========================================
-- TABLE: agent_skills (maps agents to skills)
-- PK: id (uuid)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.agent_skills (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;

-- Example RLS:
CREATE POLICY agent_skills_select
ON public.agent_skills
FOR SELECT
USING ( true );

CREATE POLICY agent_skills_admin_all
ON public.agent_skills
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

CREATE TRIGGER update_timestamp_agent_skills
BEFORE UPDATE ON public.agent_skills
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
