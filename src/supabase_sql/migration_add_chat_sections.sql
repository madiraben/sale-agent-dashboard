-- Chat sections for storing conversation history in segments
-- Each section represents a chat session until 5 minutes of inactivity

-- Add fields to chat_conversations for tracking current section and purchase status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_conversations' AND column_name = 'current_section_number'
  ) THEN
    ALTER TABLE public.chat_conversations ADD COLUMN current_section_number int DEFAULT 1;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_conversations' AND column_name = 'purchased'
  ) THEN
    ALTER TABLE public.chat_conversations ADD COLUMN purchased boolean DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_conversations' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE public.chat_conversations ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create chat_sections table
CREATE TABLE IF NOT EXISTS public.chat_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  section_number int NOT NULL,
  purchased boolean DEFAULT false,
  messages_summary text,
  message_count int DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  UNIQUE(conversation_id, section_number)
);

CREATE INDEX IF NOT EXISTS chat_sections_conversation_id_idx ON public.chat_sections(conversation_id, section_number DESC);

-- RLS for chat_sections
ALTER TABLE public.chat_sections ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_sections' AND policyname = 'chat_sections_select_own'
  ) THEN
    CREATE POLICY "chat_sections_select_own"
    ON public.chat_sections FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.chat_conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_sections' AND policyname = 'chat_sections_modify_own'
  ) THEN
    CREATE POLICY "chat_sections_modify_own"
    ON public.chat_sections FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.chat_conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.chat_conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    ));
  END IF;
END $$;

-- Add section_id to chat_messages to track which section they belong to
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'section_id'
  ) THEN
    ALTER TABLE public.chat_messages ADD COLUMN section_id uuid REFERENCES public.chat_sections(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chat_messages_section_id_idx ON public.chat_messages(section_id, created_at);

