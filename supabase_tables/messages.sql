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
-- Trigger for updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timestamp_messages
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE PROCEDURE public.update_timestamp();
