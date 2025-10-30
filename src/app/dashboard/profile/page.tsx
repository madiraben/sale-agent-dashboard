"use client";

import React from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import TextField from "@/components/ui/text-field";
import Badge from "@/components/ui/badge";
import ConfirmDialog from "@/components/ui/confirm-dialog";
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
  // fb now supports also profile fields (id, name, and profile) + multi-page management
  const [fb, setFb] = React.useState<any>(null);
  const [availablePages, setAvailablePages] = React.useState<Array<{ id: string; name: string }>>([]);
  const [selectedPageId, setSelectedPageId] = React.useState<string>("");
  const [fbBusy, setFbBusy] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sessionRes, membershipsRes, tenantRes, paymentMethod] = await Promise.all([
          supabase.auth.getSession(),
          supabase.from("user_tenants").select("role, tenants(id, name)"),
          supabase.from("tenants").select("is_active, plan, current_period_end").limit(1).single(),
          fetch("/api/billing/payment-method").then((r) => r.json()).catch(() => null),
        ]);

        if (cancelled) return;

        const em = sessionRes.data.session?.user?.email ?? "";
        setEmail(em);

        const mapped = (((membershipsRes as any)?.data as any[]) ?? []).map((m: any) => ({ id: m.tenants?.id, name: m.tenants?.name, role: m.role }));
        setTenants(mapped);

        const t = (tenantRes as any)?.data;
        setBilling({ active: Boolean(t?.is_active), plan: t?.plan, renew: t?.current_period_end });

        if (paymentMethod?.paymentMethod) setCard(paymentMethod.paymentMethod);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    // Now expect API to return the FB page, and also the user's profile if connected
    async function loadFbAll() {
      try {
        const [connected, pages] = await Promise.all([
          fetch("/api/facebook/connected").then((r) => r.json()),
          fetch("/api/facebook/pages").then((r) => r.json()).catch(() => ({ pages: [] })),
        ]);
        setFb(connected);
        const list = Array.isArray(pages?.pages) ? pages.pages.map((p: any) => ({ id: p.id, name: p.name })) : [];
        setAvailablePages(list);
      } catch {
        // ignore
      }
    }
    loadFbAll();
  }, []);

  async function onLogoutConfirmed() {
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

  async function refreshFb() {
    try {
      const [connected, pages] = await Promise.all([
        fetch("/api/facebook/connected").then((r) => r.json()),
        fetch("/api/facebook/pages").then((r) => r.json()).catch(() => ({ pages: [] })),
      ]);
      setFb(connected);
      const list = Array.isArray(pages?.pages) ? pages.pages.map((p: any) => ({ id: p.id, name: p.name })) : [];
      setAvailablePages(list);
    } catch {}
  }

  async function connectPage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/pages/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: pageId }) });
      setSelectedPageId("");
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function setActivePage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/connected/active", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: pageId }) });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function removePage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch(`/api/facebook/pages/${pageId}`, { method: "DELETE" });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function toggleActive(pageId: string, active: boolean) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch(`/api/facebook/pages/${pageId}/active`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  // Facebook info: renders profile (if available) and connected page(s)
  function FacebookProfileSection() {
    // fb: {id, name, profile?: {id, name, picture, email} }
    if (!fb?.id && !fb?.profile && !(Array.isArray(fb?.pages) && fb.pages.length > 0)) {
      return (
        <div className="rounded-md border px-3 py-2 text-sm text-gray-800">
          Not connected yet
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {fb?.profile ? (
          <div className="flex items-center gap-3 border-b pb-2 mb-2">
            {fb.profile.picture ? (
              <img
                src={fb.profile.picture}
                alt="Profile"
                className="w-8 h-8 rounded-full ring-1 ring-gray-300"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                {fb.profile.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-800">{fb.profile.name || "Facebook User"}</div>
              {fb.profile.email ? (
                <div className="text-xs text-gray-500">{fb.profile.email}</div>
              ) : null}
            </div>
          </div>
        ) : null}
        {Array.isArray((fb as any)?.active_pages) && (fb as any).active_pages.length > 0 ? (
          <div>
            <span className="block text-xs text-gray-500 mb-1">Active Pages</span>
            <div className="flex flex-col gap-2">
              {(fb as any).active_pages.map((ap: any) => (
                <div key={ap.id} className="flex items-center gap-3">
                  {ap.picture ? (
                    <img src={ap.picture} alt="Page" className="w-8 h-8 rounded-full ring-1 ring-gray-300" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                      {(ap.name || ap.id || "?").toString().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{ap.name || ap.id}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          fb?.id ? (
            <div>
              <span className="block text-xs text-gray-500 mb-1">Active Page</span>
              <div className="flex items-center gap-3">
                {fb && (fb as any).page_picture ? (
                  <img
                    src={(fb as any).page_picture as string}
                    alt="Page"
                    className="w-8 h-8 rounded-full ring-1 ring-gray-300"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                    {(fb?.name || fb?.id || "?").toString().charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{fb?.name || fb?.id}</span>
              </div>
            </div>
          ) : null
        )}

        {Array.isArray(fb?.pages) ? (
          <div className="pt-2 border-t mt-2">
            <span className="block text-xs text-gray-500 mb-1">Connected Pages</span>
            <div className="space-y-2">
              {fb.pages.length === 0 ? (
                <div className="text-sm text-gray-600">No connected pages</div>
              ) : (
                fb.pages.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!p.is_active}
                        onChange={(e) => toggleActive(p.id, e.target.checked)}
                        disabled={fbBusy}
                      />
                      <span className="text-gray-900">{p.name || p.id}</span>
                      {p.is_active ? <Badge variant="success">Active</Badge> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => removePage(p.id)} disabled={fbBusy}>Remove</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="pt-2 border-t mt-2">
          <span className="block text-xs text-gray-500 mb-1">Connect another page</span>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md px-2 py-1 text-sm"
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
            >
              <option value="">Select a page...</option>
              {availablePages
                .filter((p) => !(Array.isArray(fb?.pages) && fb.pages.some((c: any) => c.id === p.id)))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
            </select>
            <Button variant="outline" onClick={() => connectPage(selectedPageId)} disabled={!selectedPageId || fbBusy}>Connect</Button>
          </div>
        </div>
      </div>
    );
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
        <div>
          <Button
            variant="outline"
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
            onClick={() => setShowLogoutConfirm(true)}
          >
            Log out
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-base font-semibold text-gray-900">Account</div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="mb-2 block text-sm text-gray-700">Email</label>
                  </div>
                  <TextField type="email" value={email} disabled />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-gray-700">Facebook</div>
                    <a href="/api/facebook/oauth/start">
                      <Button variant="outline">{fb?.id ? "Change" : "Connect"}</Button>
                    </a>
                  </div>
                  <FacebookProfileSection />
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-4 text-base font-semibold text-gray-900">Subscription</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Status</span>
                  <Badge variant={billing?.active ? "success" : "warning"}>{billing?.active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Plan</span>
                  <Badge variant="muted">{getPlanLabel(billing?.plan)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Renews</span>
                  <span className="text-gray-900">{formatDate(billing?.renew)}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={openPortal} disabled={portalLoading}>{portalLoading ? "Opening..." : "Manage Billing"}</Button>
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
                        <td className="px-3 py-2 capitalize">
                          <Badge variant={t.role === "owner" ? "success" : t.role === "admin" ? "default" : "muted"}>{t.role}</Badge>
                        </td>
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
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign out"
        description="Are you sure you want to log out?"
        confirmText="Log out"
        destructive
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={onLogoutConfirmed}
      />
    </div>
  );
}