"use client";

import React from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import TextField from "@/components/ui/text-field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/loading-screen";

export default function Profile() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState<string>("");
  const [tenants, setTenants] = React.useState<Array<{ id: string; name: string; role: string }>>([]);
  const [billing, setBilling] = React.useState<{ active: boolean; plan?: string | null; renew?: string | null } | null>(null);
  const [card, setCard] = React.useState<{ brand: string; last4: string; exp_month: number; exp_year: number } | null>(null);
  const [portalLoading, setPortalLoading] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const em = session.session?.user?.email ?? "";
      setEmail(em);
      // load memberships (if RLS permits)
      const { data: memberships } = await supabase
        .from("user_tenants")
        .select("role, tenants(id, name)");
      const mapped = ((memberships as any) ?? []).map((m: any) => ({ id: m.tenants?.id, name: m.tenants?.name, role: m.role }));
      setTenants(mapped);
      // billing summary
      const { data: t } = await supabase.from("tenants").select("is_active, plan, current_period_end").limit(1).single();
      setBilling({ active: Boolean((t as any)?.is_active), plan: (t as any)?.plan, renew: (t as any)?.current_period_end });
      // payment method
      fetch("/api/billing/payment-method").then((r) => r.json()).then((d) => {
        if (d?.paymentMethod) setCard(d.paymentMethod);
      });
      setLoading(false);
    }
    load();
  }, []);

  async function onLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getPlanLabel(plan?: string | null) {
    const p = (plan || "").toString().toLowerCase();
    if (p.includes("monthly") || p === "monthly") return "Monthly";
    if (p.includes("quarter") || p === "quarterly") return "Quarterly";
    if (p.includes("year") || p === "yearly" || p.includes("annual")) return "Yearly";
    // fallback if plan stored is a price id or nickname: try to infer
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

  async function openPortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    window.location.href = "/dashboard/billing/portal";
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
          <span className="font-medium text-gray-900">Profile</span>
        </div>
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 text-base font-semibold text-gray-900">Account</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField label="Email" type="email" value={email} disabled />
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={onLogout}>Log out</Button>
              </div>
            </Card>

            <Card>
              <div className="mb-4 text-base font-semibold text-gray-900">Billing</div>
              <div className="space-y-1 text-sm text-gray-700">
                <div> Status: <span className={billing?.active ? "text-emerald-700" : "text-amber-700"}>{billing?.active ? "Active" : "Inactive"}</span></div>
                <div> Plan: <span className="text-gray-900">{getPlanLabel(billing?.plan)}</span></div>
                <div> Renews: <span className="text-gray-900">{formatDate(billing?.renew)}</span></div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={openPortal} disabled={portalLoading}>{portalLoading ? "Opening..." : "Manage / Cancel"}</Button>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 text-base font-semibold text-gray-900">Workspaces</div>
              <div className="rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-3 py-2">{t.name ?? t.id}</td>
                        <td className="px-3 py-2 capitalize">{t.role}</td>
                      </tr>
                    ))}
                    {tenants.length === 0 ? (
                      <tr><td colSpan={2} className="px-3 py-4 text-center text-gray-500">No workspaces</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="mb-4 text-base font-semibold text-gray-900">Payment Method</div>
              {card ? (
                <div className="text-sm text-gray-700">{card.brand.toUpperCase()} •••• {card.last4} — exp {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</div>
              ) : (
                <div className="text-sm text-gray-700">No card on file</div>
              )}
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={openPortal} disabled={portalLoading}>{portalLoading ? "Opening..." : "Update Card"}</Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
