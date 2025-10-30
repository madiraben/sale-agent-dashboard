import { findActivePageById, getTenantIdsForUser } from "@/lib/facebook/repository";
import { sendMessengerText } from "@/lib/facebook/transport";
import { runRagForUserTenants } from "@/lib/rag/engine";

export async function handleMessengerText(pageId: string, senderId: string, text: string) {
  const page = await findActivePageById(pageId);
  if (!page || !page.page_token) return;
  const tenantIds = await getTenantIdsForUser(page.user_id);
  if (tenantIds.length === 0) return;
  const reply = await runRagForUserTenants(page.user_id, tenantIds, text);
  await sendMessengerText(page.page_token, senderId, reply);
}


