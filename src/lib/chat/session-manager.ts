import { SupabaseClient } from "@supabase/supabase-js";

const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const activeSessions = new Map<string, NodeJS.Timeout>();

export interface ChatSection {
  id: string;
  conversation_id: string;
  section_number: number;
  purchased: boolean;
  messages_summary: string | null;
  message_count: number;
  started_at: string;
  closed_at: string | null;
}

/**
 * Checks if a conversation session has been inactive for 5+ minutes
 * and closes the current section if needed
 */
export async function checkAndCloseInactiveSection(
  supabase: SupabaseClient,
  conversationId: string
): Promise<{ shouldCreateNewSection: boolean; currentSectionNumber: number }> {
  // Get conversation details
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("current_section_number, last_activity_at, purchased")
    .eq("id", conversationId)
    .single();

  if (!conv) {
    return { shouldCreateNewSection: false, currentSectionNumber: 1 };
  }

  const lastActivity = conv.last_activity_at ? new Date(conv.last_activity_at) : new Date();
  const now = new Date();
  const timeSinceLastActivity = now.getTime() - lastActivity.getTime();

  // If more than 5 minutes have passed, close the current section
  if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
    console.log(`⏰ 5+ minutes passed. Closing section ${conv.current_section_number}, purchased: ${conv.purchased}`);
    await closeCurrentSection(supabase, conversationId, conv.current_section_number, conv.purchased);
    
    // Increment section number if customer hasn't purchased
    // If purchased, reset to section 1
    const newSectionNumber = conv.purchased ? 1 : (conv.current_section_number || 0) + 1;
    console.log(`➡️  New section will be: ${newSectionNumber}`);
    
    return { shouldCreateNewSection: true, currentSectionNumber: newSectionNumber };
  }

  return { shouldCreateNewSection: false, currentSectionNumber: conv.current_section_number || 1 };
}

/**
 * Closes the current section by summarizing messages and updating the database
 * This function collects ALL messages from the conversation that belong to this section,
 * creates a summary, and updates the section with final values
 */
async function closeCurrentSection(
  supabase: SupabaseClient,
  conversationId: string,
  sectionNumber: number,
  purchased: boolean
): Promise<void> {
  console.log(`🔄 Starting to close section ${sectionNumber}...`);

  // Get current section
  let { data: section } = await supabase
    .from("chat_sections")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("section_number", sectionNumber)
    .single();

  // If section doesn't exist or already closed, nothing to do
  if (!section) {
    console.log(`⚠️  Section ${sectionNumber} not found, nothing to close`);
    return;
  }
  
  if (section.closed_at) {
    console.log(`⚠️  Section ${sectionNumber} already closed at ${section.closed_at}`);
    return;
  }

  console.log(`🔍 Section ${sectionNumber} found with ID: ${section.id}`);
  console.log(`🔍 Section started at: ${section.started_at}`);

  // Strategy: Get ALL messages from this conversation that were created after this section started
  // and don't have a closed section yet (or belong to this section)
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, section_id")
    .eq("conversation_id", conversationId)
    .gte("created_at", section.started_at)
    .order("created_at", { ascending: true });

  console.log(`📨 Found ${messages?.length || 0} total messages since section ${sectionNumber} started`);
  
  // Filter to only messages that belong to this section (or have no section assigned yet)
  const sectionMessages = messages?.filter((m: any) => 
    m.section_id === section.id || m.section_id === null
  ) || [];

  console.log(`📦 ${sectionMessages.length} messages belong to section ${sectionNumber}`);

  // Link any unassigned messages to this section before closing
  if (sectionMessages.some((m: any) => m.section_id === null)) {
    const unassignedIds = sectionMessages.filter((m: any) => m.section_id === null).map((m: any) => m.id);
    console.log(`🔗 Linking ${unassignedIds.length} unassigned messages to section ${sectionNumber}`);
    
    await supabase
      .from("chat_messages")
      .update({ section_id: section.id })
      .in("id", unassignedIds);
  }

  // If no messages in this section, just mark it closed without summary
  if (sectionMessages.length === 0) {
    console.log(`⚠️  No messages to summarize for section ${sectionNumber}`);
    await supabase
      .from("chat_sections")
      .update({
        closed_at: new Date().toISOString(),
        purchased: purchased,
        messages_summary: null,
        message_count: 0,
      })
      .eq("id", section.id);
    return;
  }

  // Create summary of the conversation
  const summary = sectionMessages
    .map((m: any) => `${m.role}: ${m.content.slice(0, 200)}`)
    .join("\n");

  console.log(`📝 Section summary created: ${summary.length} chars, ${sectionMessages.length} messages`);

  // Update section with ALL fields: summary, count, purchased status, and close it
  const updateData = {
    closed_at: new Date().toISOString(),
    messages_summary: summary,
    message_count: sectionMessages.length,
    purchased: purchased, // Captures the purchased status at the time of closing
  };

  console.log(`💾 Updating section ${sectionNumber} with:`, {
    message_count: updateData.message_count,
    summary_length: updateData.messages_summary.length,
    purchased: updateData.purchased,
  });

  const { error: updateError } = await supabase
    .from("chat_sections")
    .update(updateData)
    .eq("id", section.id);

  if (updateError) {
    console.error(`❌ Error updating section ${sectionNumber}:`, updateError);
  } else {
    console.log(`✅ Section ${sectionNumber} closed successfully!`);
  }
}

/**
 * Updates the last activity time for a conversation
 */
export async function updateConversationActivity(
  supabase: SupabaseClient,
  conversationId: string,
  sectionNumber?: number
): Promise<void> {
  const updates: any = {
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (sectionNumber !== undefined) {
    updates.current_section_number = sectionNumber;
  }

  await supabase
    .from("chat_conversations")
    .update(updates)
    .eq("id", conversationId);
}

/**
 * Detects if the message indicates a purchase confirmation
 * Looks for patterns like addresses, phone numbers, confirmation keywords
 */
export function detectPurchaseIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Purchase confirmation keywords
  const confirmKeywords = [
    "confirm",
    "buy",
    "purchase",
    "order",
    "checkout",
    "yes, i'll take it",
    "i'll buy",
    "i want to buy",
  ];

  // Check for address-like patterns (street number, zip code, etc.)
  const hasAddress = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|way|court|ct)/i.test(message);
  
  // Check for phone number patterns
  const hasPhone = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(message);
  
  // Check for email
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(message);

  // Purchase is confirmed if we have confirmation keywords + contact info
  const hasConfirmKeyword = confirmKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasContactInfo = hasAddress || hasPhone || hasEmail;

  return hasConfirmKeyword && hasContactInfo;
}

/**
 * Marks a conversation as purchased
 */
export async function markConversationAsPurchased(
  supabase: SupabaseClient,
  conversationId: string
): Promise<void> {
  // Update conversation
  await supabase
    .from("chat_conversations")
    .update({ purchased: true })
    .eq("id", conversationId);

  // Update current open section
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("current_section_number")
    .eq("id", conversationId)
    .single();

  if (conv?.current_section_number) {
    await supabase
      .from("chat_sections")
      .update({ purchased: true })
      .eq("conversation_id", conversationId)
      .eq("section_number", conv.current_section_number);
  }
}

/**
 * Gets all previous section summaries for a conversation
 * Used to provide context/memory to the AI
 */
export async function getPreviousSectionSummaries(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string> {
  const { data: sections } = await supabase
    .from("chat_sections")
    .select("section_number, messages_summary, purchased, closed_at, message_count")
    .eq("conversation_id", conversationId)
    .not("closed_at", "is", null)
    .order("section_number", { ascending: true });

  if (!sections || sections.length === 0) {
    return "";
  }

  // Filter out sections with no messages (they don't provide context)
  const sectionsWithMessages = sections.filter((s: any) => 
    s.messages_summary && s.messages_summary.trim().length > 0 && (s.message_count || 0) > 0
  );

  if (sectionsWithMessages.length === 0) {
    return "";
  }

  const summaries = sectionsWithMessages
    .map((s: any) => 
      `[Section ${s.section_number}${s.purchased ? " - PURCHASED" : ""}]:\n${s.messages_summary}`
    )
    .join("\n\n");

  return `Previous conversation history:\n${summaries}`;
}

/**
 * Schedules automatic section closure after 5 minutes of inactivity
 * This is for real-time detection (used in streaming responses)
 */
export function scheduleSessionTimeout(
  conversationId: string,
  callback: () => Promise<void>
): void {
  // Clear existing timeout for this conversation
  const existingTimeout = activeSessions.get(conversationId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Set new timeout
  const timeout = setTimeout(async () => {
    await callback();
    activeSessions.delete(conversationId);
  }, SESSION_TIMEOUT_MS);

  activeSessions.set(conversationId, timeout);
}

/**
 * Cancels the scheduled timeout for a conversation (when new activity happens)
 */
export function cancelSessionTimeout(conversationId: string): void {
  const existingTimeout = activeSessions.get(conversationId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    activeSessions.delete(conversationId);
  }
}

/**
 * Ensures a section exists for the current conversation
 */
export async function ensureCurrentSection(
  supabase: SupabaseClient,
  conversationId: string,
  sectionNumber: number,
  purchased: boolean
): Promise<string | null> {
  // Check if section exists
  const { data: existing } = await supabase
    .from("chat_sections")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("section_number", sectionNumber)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new section
  console.log(`✨ Creating new section ${sectionNumber}, purchased: ${purchased}`);
  const { data: newSection, error } = await supabase
    .from("chat_sections")
    .insert({
      conversation_id: conversationId,
      section_number: sectionNumber,
      purchased: purchased,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Error creating section:", error);
    return null;
  }

  console.log(`✅ Section created with ID: ${newSection?.id}`);
  return newSection?.id || null;
}

