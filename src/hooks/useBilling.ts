"use client";

import { useState, useEffect, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useBilling() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [billing, setBilling] = useState<{
    active: boolean;
    plan?: string | null;
    renew?: string | null;
  } | null>(null);
  const [card, setCard] = useState<{
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tenantRes, paymentMethod] = await Promise.all([
          supabase.from("tenants").select("is_active, plan, current_period_end").limit(1).single(),
          fetch("/api/billing/payment-method").then((r) => r.json()).catch(() => null),
        ]);

        if (cancelled) return;

        const t = (tenantRes as any)?.data;
        setBilling({ active: Boolean(t?.is_active), plan: t?.plan, renew: t?.current_period_end });

        if (paymentMethod?.paymentMethod) setCard(paymentMethod.paymentMethod);
      } catch (error) {
        // Handle error silently
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function openPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    window.location.href = "/dashboard/billing/portal";
  }

  function getPlanLabel(plan?: string | null) {
    const p = (plan || "").toString().toLowerCase();
    if (p.includes("monthly") || p === "monthly") return "Monthly";
    if (p.includes("quarter") || p === "quarterly") return "Quarterly";
    if (p.includes("year") || p === "yearly" || p.includes("annual")) return "Yearly";
    if (p.startsWith("price_")) return "Paid";
    return p ? p : "-";
  }

  function formatDate(iso?: string | null) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  }

  return {
    billing,
    card,
    portalLoading,
    openPortal,
    getPlanLabel,
    formatDate,
  };
}

