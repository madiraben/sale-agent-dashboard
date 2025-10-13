"use client";

import React from "react";
import Button from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Profile() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState<string>("");
  const [tenants, setTenants] = React.useState<Array<{ id: string; name: string; role: string }>>([]);
  const [billing, setBilling] = React.useState<{ active: boolean; plan?: string | null; renew?: string | null } | null>(null);
  const [card, setCard] = React.useState<{ brand: string; last4: string; exp_month: number; exp_year: number } | null>(null);

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

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 text-lg font-semibold text-gray-900">Profile</div>
      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="text-gray-900">{email || "-"}</div>
          </div>
          <div>
            <div className="mb-2 text-sm text-gray-500">Workspaces</div>
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
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">Billing</div>
              <div className="text-sm text-gray-700">Status: <span className={billing?.active ? "text-emerald-700" : "text-amber-700"}>{billing?.active ? "Active" : "Inactive"}</span></div>
              <div className="text-sm text-gray-700">Plan: <span className="text-gray-900">{billing?.plan ?? "-"}</span></div>
              <div className="text-sm text-gray-700">Renews: <span className="text-gray-900">{billing?.renew ?? "-"}</span></div>
              <div className="mt-3">
                <Button onClick={() => window.location.href = "/billing"}>Manage Billing</Button>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="mb-2 text-sm font-semibold text-gray-900">Payment Method</div>
              {card ? (
                <div className="text-sm text-gray-700">{card.brand.toUpperCase()} •••• {card.last4} — exp {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</div>
              ) : (
                <div className="text-sm text-gray-700">No card on file</div>
              )}
              <div className="mt-3">
                <Button variant="outline" onClick={() => window.location.href = "/billing"}>Update Card</Button>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={onLogout}>Log out</Button>
          </div>
        </div>
      )}
    </div>
  );
}
