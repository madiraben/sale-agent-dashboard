-- Track external messenger conversations (Facebook Messenger, Telegram, etc.)
-- Links external sender IDs to internal conversation tracking

CREATE TABLE IF NOT EXISTS public.external_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('messenger', 'telegram', 'whatsapp')),
  external_user_id text NOT NULL,
  page_id text,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  shop_owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform, external_user_id, page_id)
);

CREATE INDEX IF NOT EXISTS external_conversations_lookup_idx 
  ON public.external_conversations(platform, external_user_id, page_id);

CREATE INDEX IF NOT EXISTS external_conversations_conversation_id_idx 
  ON public.external_conversations(conversation_id);

-- No RLS needed - accessed server-side only via service role

