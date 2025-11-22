import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
}

export async function requireAuth(
  req: NextRequest
): Promise<{ error: NextResponse; context: null } | { error: null; context: AuthContext }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        ),
        context: null,
      };
    }

    return {
      error: null,
      context: { user, supabase },
    };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: "Internal error", message: "Authentication failed" },
        { status: 500 }
      ),
      context: null,
    };
  }
}

// Optional: Check for specific permissions
export async function requireAuthWithTenant(
  req: NextRequest
): Promise<
  | { error: NextResponse; context: null }
  | { error: null; context: AuthContext & { tenantId: string } }
> {
  const authResult = await requireAuth(req);
  if (authResult.error) {
    return authResult;
  }

  const { supabase, user } = authResult.context;

  try {
    const { data: userTenant } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .limit(1)
      .single();

    const tenantId = userTenant?.tenant_id;

    if (!tenantId) {
      return {
        error: NextResponse.json(
          { error: "No tenant found", message: "User is not associated with any tenant" },
          { status: 403 }
        ),
        context: null,
      };
    }

    return {
      error: null,
      context: { user, supabase, tenantId },
    };
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: "Internal error", message: "Failed to fetch tenant information" },
        { status: 500 }
      ),
      context: null,
    };
  }
}

