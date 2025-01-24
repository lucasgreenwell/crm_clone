-- Contents of agent_skills.sql --
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


-- Contents of knowledge_base.sql --
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


-- Contents of messages.sql --
-- ===========================================
-- TABLE: messages
-- PK: id (uuid)
-- Direct communications between one user and another (e.g. customer <-> employee)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES auth.users (id),
  recipient_id uuid NOT NULL REFERENCES auth.users (id),
  message      text NOT NULL,
  seen         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: sender or recipient can SELECT the message
CREATE POLICY messages_select
ON public.messages
FOR SELECT
USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- Policy: sender can INSERT a message to a valid recipient
CREATE POLICY messages_insert
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
);

-- Policy: sender can UPDATE their own message
CREATE POLICY messages_update_owner
ON public.messages
FOR UPDATE
USING (
  sender_id = auth.uid()
)
WITH CHECK (
  sender_id = auth.uid()
);

-- ===========================================
-- Functions
-- ===========================================

-- Function to update seen status
CREATE OR REPLACE FUNCTION public.update_message_seen(message_id uuid, recipient_id uuid)
RETURNS void AS $$
BEGIN
  -- Update seen status if the message hasn't been seen yet
  UPDATE public.messages
  SET seen = true
  WHERE id = message_id AND recipient_id = recipient_id AND NOT seen;
END;
$$ LANGUAGE plpgsql;

-- Function to update the `updated_at` column
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Triggers
-- ===========================================

CREATE TRIGGER update_timestamp_messages
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();


-- Contents of profiles.sql --
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
  is_oncall    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: owners can SELECT/UPDATE their own row
CREATE POLICY profiles_owner_select
ON public.profiles
FOR SELECT
USING ( user_id = auth.uid() );

CREATE POLICY profiles_owner_update
ON public.profiles
FOR UPDATE
USING ( user_id = auth.uid() )
WITH CHECK ( user_id = auth.uid() );

-- Policy: users with the 'admin' role can do anything
CREATE POLICY profiles_admin_all
ON public.profiles
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

-- Policy: users with the 'agent' role can SELECT all profiles
CREATE POLICY profiles_agent_select
ON public.profiles
FOR SELECT
USING ( EXISTS (
  SELECT 1 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
    AND role = 'agent'
) );

-- Function to ensure only one user can be oncall at a time
CREATE OR REPLACE FUNCTION update_oncall_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_oncall = true THEN
    -- Set all other users' is_oncall to false
    UPDATE public.profiles 
    SET is_oncall = false 
    WHERE user_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain single oncall user
CREATE TRIGGER ensure_single_oncall
BEFORE UPDATE OR INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_oncall_status();

-- Function to update the `updated_at` column
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Trigger to keep updated_at current
CREATE TRIGGER update_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();


-- Contents of skills.sql --
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


-- Contents of tags.sql --
-- ===========================================
-- TABLE: tags
-- PK: id (uuid)
-- Tags for categorizing or sorting tickets
-- ===========================================
CREATE TABLE IF NOT EXISTS public.tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: anyone can SELECT tags
CREATE POLICY tags_select
ON public.tags
FOR SELECT
USING ( true );

-- Policy: authenticated users with the "admin" role can INSERT tags
CREATE POLICY tags_insert
ON public.tags
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: authenticated users with the "admin" role can UPDATE tags
CREATE POLICY tags_update
ON public.tags
FOR UPDATE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Policy: authenticated users with the "admin" role can DELETE tags
CREATE POLICY tags_delete
ON public.tags
FOR DELETE
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
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

CREATE TRIGGER update_timestamp_tags
BEFORE UPDATE ON public.tags
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();


-- Contents of team_members.sql --
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


-- Contents of teams.sql --
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


-- Contents of templates.sql --
-- ===========================================
-- TABLE: templates
-- PK: id (uuid)
-- Stored quick-response templates
-- ===========================================
CREATE TABLE IF NOT EXISTS public.templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  content     text NOT NULL, -- The stored template text
  created_by  uuid NOT NULL REFERENCES auth.users (id),
  created_at  timestamptz NOT NULL DEFAULT NOW(),
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: authenticated users with the "agent" role can INSERT templates
CREATE POLICY templates_insert
ON public.templates
FOR INSERT
WITH CHECK (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
  AND created_by = auth.uid()
);

-- Policy: authenticated users with the "agent" role can SELECT templates
CREATE POLICY templates_select
ON public.templates
FOR SELECT
USING (
  EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'agent'
  )
);

-- Policy: agents can UPDATE templates they created
CREATE POLICY templates_update_own
ON public.templates
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

-- Policy: agents with the "admin" role can UPDATE all templates
CREATE POLICY templates_update_all
ON public.templates
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

CREATE TRIGGER update_timestamp_templates
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();


-- Contents of ticket_feedback.sql --
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


-- Contents of tickets.sql --
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

-- Policy: customers can SELECT their own tickets
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

-- Policy: customers can INSERT tickets
CREATE POLICY tickets_customer_insert
ON public.tickets
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'customer'
  )
);

-- Policy: customers can UPDATE their own tickets
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

-- Policy: agents can SELECT tickets assigned to them or their team
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

-- Policy: agents can UPDATE tickets assigned to them or their team
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

-- Policy: admins can SELECT all tickets
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

-- Policy: admins can UPDATE all tickets
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


