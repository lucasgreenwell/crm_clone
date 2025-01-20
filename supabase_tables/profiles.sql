-- ===========================================
-- TABLE: profiles
-- PK: user_id references auth.users(id)
-- RLS: owners, agents, admins
-- ===========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  role         text NOT NULL DEFAULT 'customer' 
    CHECK (role IN ('customer','agent','admin')),
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_owner_select
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
);

CREATE POLICY profiles_owner_update
ON public.profiles
FOR UPDATE
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY profiles_admin_all
ON public.profiles
FOR ALL
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

CREATE POLICY profiles_agent_select
ON public.profiles
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'agent'
  )
);


-- Optional: Trigger to keep updated_at current
CREATE TRIGGER update_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
