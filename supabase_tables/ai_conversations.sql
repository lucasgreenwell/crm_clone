-- ===========================================
-- TABLE: ai_conversations
-- PK: id (uuid)
-- RLS: users can only access their own conversations
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- RLS Policies
-- ===========================================

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view their own conversations"
ON ai_conversations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can insert their own conversations"
ON ai_conversations FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ===========================================
-- Trigger for updated_at
-- ===========================================
CREATE TRIGGER update_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 