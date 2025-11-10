-- Test Section Closure
-- Use this to manually trigger section closure for testing

-- Step 1: Find your test conversation ID
SELECT id, title, current_section_number, purchased, last_activity_at
FROM chat_conversations
ORDER BY updated_at DESC
LIMIT 5;

-- Step 2: Set last_activity_at to 6 minutes ago (replace YOUR_CONVERSATION_ID)
UPDATE chat_conversations 
SET last_activity_at = now() - interval '6 minutes'
WHERE id = 'YOUR_CONVERSATION_ID';

-- Step 3: View current sections BEFORE next message
SELECT * FROM chat_sections 
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY section_number;

-- Step 4: View messages linked to sections
SELECT 
  s.section_number,
  s.closed_at,
  s.messages_summary,
  s.message_count,
  s.purchased,
  COUNT(m.id) as actual_message_count
FROM chat_sections s
LEFT JOIN chat_messages m ON m.section_id = s.id
WHERE s.conversation_id = 'YOUR_CONVERSATION_ID'
GROUP BY s.id, s.section_number, s.closed_at, s.messages_summary, s.message_count, s.purchased
ORDER BY s.section_number;

-- Step 5: After sending a new message, check that section was closed properly
SELECT 
  id,
  section_number,
  purchased,
  message_count,
  LENGTH(messages_summary) as summary_length,
  closed_at IS NOT NULL as is_closed,
  started_at,
  closed_at
FROM chat_sections 
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY section_number;

-- Step 6: Verify messages are properly linked
SELECT 
  m.id,
  m.role,
  LEFT(m.content, 50) as content_preview,
  m.section_id,
  s.section_number,
  m.created_at
FROM chat_messages m
LEFT JOIN chat_sections s ON s.id = m.section_id
WHERE m.conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY m.created_at;

-- Debugging: Check for orphaned messages (no section_id)
SELECT 
  id,
  role,
  LEFT(content, 50) as content_preview,
  section_id,
  created_at
FROM chat_messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
  AND section_id IS NULL
ORDER BY created_at;

