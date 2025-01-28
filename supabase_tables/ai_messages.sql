-- ===========================================
-- TABLE: ai_messages
-- PK: id (uuid)
-- RLS: users can only access messages in their conversations
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  ticket_ids UUID[] DEFAULT NULL,
  message_ids UUID[] DEFAULT NULL,
  profile_ids UUID[] DEFAULT NULL,
  team_ids UUID[] DEFAULT NULL,
  template_ids UUID[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Add constraint to ensure user_id is not null when is_ai is false
  CONSTRAINT user_id_required_when_not_ai CHECK (
    (is_ai = true) OR (user_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON ai_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert messages in their conversations
CREATE POLICY "Users can insert messages in their conversations"
ON ai_messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM ai_conversations WHERE user_id = auth.uid()
  )
);

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_user_id ON ai_messages(user_id);

-- ===========================================
-- Trigger for updated_at
-- ===========================================
CREATE TRIGGER update_ai_messages_updated_at
    BEFORE UPDATE ON ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 