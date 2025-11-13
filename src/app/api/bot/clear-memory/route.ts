import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import logger from "@/lib/logger";

/**
 * DELETE /api/bot/clear-memory
 * Clears all bot chat sessions and conversation history for the authenticated user
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // Delete all bot sessions for this user
    const { error: sessionsError, count: sessionsCount } = await admin
      .from("bot_sessions")
      .delete({ count: "exact" })
      .eq("owner_user_id", user.id);

    if (sessionsError) {
      logger.error("Error deleting bot sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to clear bot sessions" },
        { status: 500 }
      );
    }

    // Delete all chat messages for this user
    const { error: messagesError, count: messagesCount } = await admin
      .from("bot_chat_messages")
      .delete({ count: "exact" })
      .eq("owner_user_id", user.id);

    if (messagesError) {
      logger.error("Error deleting chat messages:", messagesError);
      // Don't fail if messages deletion fails, sessions are more important
    }

    logger.info("Bot memory cleared successfully", {
      userId: user.id,
      sessionsDeleted: sessionsCount || 0,
      messagesDeleted: messagesCount || 0,
    });

    return NextResponse.json({
      ok: true,
      message: "Bot memory cleared successfully",
      sessionsDeleted: sessionsCount || 0,
      messagesDeleted: messagesCount || 0,
    });
  } catch (error: any) {
    logger.error("Error clearing bot memory:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}




