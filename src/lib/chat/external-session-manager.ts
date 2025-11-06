import { createClient } from "@supabase/supabase-js";
import {
  checkAndCloseInactiveSection,
  updateConversationActivity,
  detectPurchaseIntent,
  markConversationAsPurchased,
  getPreviousSectionSummaries,
  ensureCurrentSection,
} from "./session-manager";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Gets or creates a conversation for an external messenger user
 * Returns conversation ID and current section info
 */
export async function getOrCreateExternalConversation(params: {
  platform: "messenger" | "telegram" | "whatsapp";
  externalUserId: string;
  pageId?: string;
  shopOwnerUserId: string;
}): Promise<{
  conversationId: string;
  currentSectionNumber: number;
  purchased: boolean;
  sectionId: string | null;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { platform, externalUserId, pageId, shopOwnerUserId } = params;

  // Look up existing external conversation mapping
  const { data: externalConv } = await supabase
    .from("external_conversations")
    .select("conversation_id, shop_owner_user_id")
    .eq("platform", platform)
    .eq("external_user_id", externalUserId)
    .eq("page_id", pageId || "")
    .single();

  let conversationId: string;
  let currentSectionNumber = 1;
  let purchased = false;

  if (externalConv?.conversation_id) {
    // Existing conversation
    conversationId = externalConv.conversation_id;

    // Get conversation details
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("current_section_number, purchased")
      .eq("id", conversationId)
      .single();

    if (conv) {
      purchased = conv.purchased || false;

      // Check if 5 minutes have passed since last activity
      const { shouldCreateNewSection, currentSectionNumber: newSectionNumber } =
        await checkAndCloseInactiveSection(supabase, conversationId);

      if (shouldCreateNewSection) {
        currentSectionNumber = newSectionNumber;
        // Update conversation with new section number
        await supabase
          .from("chat_conversations")
          .update({
            current_section_number: currentSectionNumber,
            // Reset purchased if moving to a new section after purchase
            purchased: purchased && currentSectionNumber > 1 ? false : purchased,
          })
          .eq("id", conversationId);

        // If purchased and starting new section, reset the flag
        if (purchased && currentSectionNumber === 1) {
          purchased = false;
        }
      } else {
        currentSectionNumber = conv.current_section_number || 1;
      }
    }

    // Update external conversation timestamp
    await supabase
      .from("external_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", (externalConv as any).id);
  } else {
    // Create new conversation
    const { data: newConv } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: shopOwnerUserId,
        title: `${platform} chat from ${externalUserId.slice(0, 20)}`,
        current_section_number: 1,
        purchased: false,
        last_activity_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!newConv) {
      throw new Error("Failed to create conversation");
    }

    conversationId = newConv.id;

    // Create external conversation mapping
    await supabase.from("external_conversations").insert({
      platform,
      external_user_id: externalUserId,
      page_id: pageId || null,
      conversation_id: conversationId,
      shop_owner_user_id: shopOwnerUserId,
    });
  }

  // Ensure current section exists
  const sectionId = await ensureCurrentSection(supabase, conversationId, currentSectionNumber, purchased);

  return {
    conversationId,
    currentSectionNumber,
    purchased,
    sectionId,
  };
}

/**
 * Processes an incoming message from an external platform
 * Handles session management, purchase detection, and message storage
 */
export async function processExternalMessage(params: {
  platform: "messenger" | "telegram" | "whatsapp";
  externalUserId: string;
  pageId?: string;
  shopOwnerUserId: string;
  messageText: string;
  tenantId?: string;
}): Promise<{
  conversationId: string;
  sectionId: string | null;
  previousSectionsSummary: string;
  isPurchaseDetected: boolean;
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { messageText, tenantId, shopOwnerUserId } = params;

  // Get or create conversation
  const { conversationId, currentSectionNumber, purchased, sectionId } =
    await getOrCreateExternalConversation(params);

  // Detect purchase intent
  let isPurchaseDetected = detectPurchaseIntent(messageText);
  if (isPurchaseDetected && !purchased) {
    await markConversationAsPurchased(supabase, conversationId);
    console.log("🛒 Purchase detected in external message!");
  }

  // Store the user message
  console.log(`💬 Storing user message with section_id: ${sectionId}, tenant_id: ${tenantId}, user_id: ${shopOwnerUserId}`);
  const messageData: any = {
    conversation_id: conversationId,
    role: "user",
    content: messageText,
    section_id: sectionId,
    user_id: shopOwnerUserId, // Required field
  };
  
  // Add tenant_id if provided
  if (tenantId) {
    messageData.tenant_id = tenantId;
  }
  
  const { error: insertError } = await supabase.from("chat_messages").insert(messageData);

  if (insertError) {
    console.error("❌ Error storing user message:", insertError);
    console.error("❌ Insert data was:", messageData);
  } else {
    console.log("✅ User message stored successfully");
  }

  // Update activity timestamp
  await updateConversationActivity(supabase, conversationId, currentSectionNumber);

  // Get previous section summaries for context
  const previousSectionsSummary = await getPreviousSectionSummaries(supabase, conversationId);

  return {
    conversationId,
    sectionId,
    previousSectionsSummary,
    isPurchaseDetected,
  };
}

/**
 * Stores the assistant's reply to an external conversation
 */
export async function storeExternalReply(params: {
  conversationId: string;
  sectionId: string | null;
  replyText: string;
  tenantId?: string;
  userId: string;
}): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { conversationId, sectionId, replyText, tenantId, userId } = params;

  // Store the assistant message
  console.log(`🤖 Storing assistant reply with section_id: ${sectionId}, tenant_id: ${tenantId}, user_id: ${userId}`);
  const messageData: any = {
    conversation_id: conversationId,
    role: "assistant",
    content: replyText,
    section_id: sectionId,
    user_id: userId, // Required field
  };
  
  // Add tenant_id if provided
  if (tenantId) {
    messageData.tenant_id = tenantId;
  }
  
  const { error: insertError } = await supabase.from("chat_messages").insert(messageData);

  if (insertError) {
    console.error("❌ Error storing assistant message:", insertError);
    console.error("❌ Insert data was:", messageData);
  } else {
    console.log("✅ Assistant message stored successfully");
  }

  // Update activity timestamp
  const { data: conv } = await supabase
    .from("chat_conversations")
    .select("current_section_number")
    .eq("id", conversationId)
    .single();

  if (conv) {
    await updateConversationActivity(supabase, conversationId, conv.current_section_number);
  }
}

