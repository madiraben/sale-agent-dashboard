"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useProfile() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; role: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sessionRes, membershipsRes] = await Promise.all([
          supabase.auth.getSession(),
          supabase.from("user_tenants").select("role, tenants(id, name)"),
        ]);

        if (cancelled) return;

        const em = sessionRes.data.session?.user?.email ?? "";
        setEmail(em);

        const mapped = (((membershipsRes as any)?.data as any[]) ?? []).map((m: any) => ({
          id: m.tenants?.id,
          name: m.tenants?.name,
          role: m.role,
        }));
        setTenants(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return { email, tenants, loading, supabase };
}

