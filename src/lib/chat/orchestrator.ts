import { findActivePageById, getTenantIdsForUser } from "@/lib/facebook/repository";
import { sendMessengerText } from "@/lib/facebook/transport";
import { runRagWithContext } from "@/lib/rag/engine";
import { processExternalMessage, storeExternalReply } from "./external-session-manager";

export async function handleMessengerText(pageId: string, senderId: string, text: string) {
  const page = await findActivePageById(pageId);
  if (!page || !page.page_token) return;
  
  const tenantIds = await getTenantIdsForUser(page.user_id);
  if (tenantIds.length === 0) return;

  // Use first tenant ID for storing messages
  const tenantId = tenantIds[0];

  try {
    // Process message with session management
    const { conversationId, sectionId, previousSectionsSummary } = await processExternalMessage({
      platform: "messenger",
      externalUserId: senderId,
      pageId: pageId,
      shopOwnerUserId: page.user_id,
      messageText: text,
      tenantId: tenantId, // Pass tenant_id for message storage
    });

    // Generate reply with RAG + previous sections context
    const reply = await runRagWithContext(
      page.user_id,
      tenantIds,
      text,
      previousSectionsSummary
    );

    // Store the assistant's reply
    await storeExternalReply({
      conversationId,
      sectionId,
      replyText: reply,
      tenantId: tenantId, // Pass tenant_id for message storage
      userId: page.user_id, // Pass user_id for message storage (required field)
    });

    // Send reply via Messenger
    await sendMessengerText(page.page_token, senderId, reply);
  } catch (error) {
    console.error("Error handling Messenger text:", error);
    // Fallback to simple reply on error
    await sendMessengerText(page.page_token, senderId, "Sorry, I encountered an error. Please try again.");
  }
}


