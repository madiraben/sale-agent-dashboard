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
import { toast } from "react-toastify";

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
  // telegram
  const [tg, setTg] = React.useState<any>(null);
  const [tgToken, setTgToken] = React.useState<string>("");
  const [tgBusy, setTgBusy] = React.useState(false);

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

  React.useEffect(() => {
    async function loadTg() {
      try {
        const data = await fetch("/api/telegram/connected").then((r) => r.json()).catch(() => ({}));
        setTg(data && (data.username || data.id) ? data : null);
      } catch {}
    }
    loadTg();
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

  async function refreshTg() {
    try {
      const data = await fetch("/api/telegram/connected").then((r) => r.json()).catch(() => ({}));
      setTg(data && (data.username || data.id) ? data : null);
    } catch {}
  }

  async function connectTelegram() {
    if (!tgToken || tgBusy) return;
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: tgToken }),
      });
      if (res.ok) {
        toast.success("Telegram bot connected successfully!");
        setTgToken("");
        await refreshTg();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to connect Telegram bot. Please check your token.");
      }
    } catch (error) {
      toast.error("An error occurred while connecting Telegram bot.");
    } finally {
      setTgBusy(false);
    }
  }

  async function disconnectTelegram() {
    if (tgBusy) return;
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/connected", { method: "DELETE" });
      if (res.ok) {
        toast.success("Telegram bot disconnected successfully!");
        await refreshTg();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to disconnect Telegram bot.");
      }
    } catch (error) {
      toast.error("An error occurred while disconnecting Telegram bot.");
    } finally {
      setTgBusy(false);
    }
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

  async function disconnectFacebook() {
    if (fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/connected", { method: "DELETE" });
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
        <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm text-center">
          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-gray-600">Not connected yet</div>
          <div className="text-xs text-gray-500 mt-1">Click Connect to get started</div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
        {fb?.profile && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200">
            {fb.profile.picture ? (
              <img
                src={fb.profile.picture}
                alt="Profile"
                className="w-10 h-10 rounded-full ring-2 ring-white shadow"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-sm font-semibold shadow">
                {fb.profile.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{fb.profile.name || "Facebook User"}</div>
              {fb.profile.email && (
                <div className="text-xs text-gray-600">{fb.profile.email}</div>
              )}
            </div>
          </div>
        )}
        
        {Array.isArray((fb as any)?.active_pages) && (fb as any).active_pages.length > 0 && (
          <div className="px-4 py-3 border-b border-blue-100">
            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Pages</span>
            <div className="flex flex-col gap-2">
              {(fb as any).active_pages.map((ap: any) => (
                <div key={ap.id} className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                  {ap.picture ? (
                    <img src={ap.picture} alt="Page" className="w-8 h-8 rounded-full ring-1 ring-blue-300 shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold shadow-sm">
                      {(ap.name || ap.id || "?").toString().charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-900">{ap.name || ap.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!Array.isArray((fb as any)?.active_pages) && fb?.id && (
          <div className="px-4 py-3 border-b border-blue-100">
            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Page</span>
            <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
              {fb && (fb as any).page_picture ? (
                <img
                  src={(fb as any).page_picture as string}
                  alt="Page"
                  className="w-8 h-8 rounded-full ring-1 ring-blue-300 shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold shadow-sm">
                  {(fb?.name || fb?.id || "?").toString().charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-gray-900">{fb?.name || fb?.id}</span>
            </div>
          </div>
        )}

        {Array.isArray(fb?.pages) && fb.pages.length > 0 && (
          <div className="px-4 py-3 border-b border-blue-100">
            <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Manage Pages</span>
            <div className="space-y-2">
              {fb.pages.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                      checked={!!p.is_active}
                      onChange={(e) => toggleActive(p.id, e.target.checked)}
                      disabled={fbBusy}
                    />
                    <span className="text-sm font-medium text-gray-900">{p.name || p.id}</span>
                    {p.is_active && <Badge variant="success">Active</Badge>}
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-1 px-2" 
                    onClick={() => removePage(p.id)} 
                    disabled={fbBusy}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50">
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Add Another Page</span>
          <div className="flex items-center gap-2">
            <select
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              disabled={fbBusy}
            >
              <option value="">Select a page...</option>
              {availablePages
                .filter((p) => !(Array.isArray(fb?.pages) && fb.pages.some((c: any) => c.id === p.id)))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
            </select>
            <Button 
              variant="outline" 
              className="bg-white shadow-sm" 
              onClick={() => connectPage(selectedPageId)} 
              disabled={!selectedPageId || fbBusy}
            >
              {fbBusy ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and integrations</p>
        </div>
        <Button
          variant="outline"
          className="border-rose-200 text-rose-600 hover:bg-rose-50"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log out
        </Button>
      </div>

      {loading ? (
        <LoadingScreen />
      ) : (
        <>
          {/* Account & Integrations Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Account Info Card */}
              <Card>
                <div className="border-b pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account Information
                  </h2>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <TextField type="email" value={email} disabled />
                </div>
              </Card>

              {/* Social Integrations Card */}
              <Card>
                <div className="border-b pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Social Integrations
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Connect your social media accounts to enable bot features</p>
                </div>

                <div className="space-y-6">
                  {/* Facebook Integration */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base">Facebook Messenger</h3>
                          <p className="text-sm text-gray-600">Connect your Facebook pages</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href="/api/facebook/oauth/start">
                          <Button variant="outline" className="bg-white shadow-sm">
                            {fb?.id ? (
                              <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>Reconnect</>
                            ) : (
                              <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>Connect</>
                            )}
                          </Button>
                        </a>
                        {fb?.id && (
                          <Button
                            variant="outline"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 bg-white shadow-sm"
                            onClick={disconnectFacebook}
                            disabled={fbBusy}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </div>
                    <FacebookProfileSection />
                  </div>

                  {/* Telegram Integration */}
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-base">Telegram Bot</h3>
                        <p className="text-sm text-gray-600">Enable RAG-powered bot for Telegram</p>
                      </div>
                    </div>
                    
                    {tg ? (
                      <div className="bg-white rounded-lg p-4 border border-cyan-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">@{tg.username || tg.id}</div>
                              <div className="text-xs text-gray-500">Connected bot</div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 bg-white shadow-sm" 
                            onClick={disconnectTelegram} 
                            disabled={tgBusy}
                          >
                            {tgBusy ? (
                              <><svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>Disconnecting...</>
                            ) : (
                              <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>Disconnect</>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-4 border border-cyan-200 shadow-sm">
                        <div className="space-y-3">
                          <TextField 
                            placeholder="Paste your BotFather token here..." 
                            value={tgToken} 
                            onChange={(e) => setTgToken(e.target.value)} 
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && tgToken && !tgBusy) {
                                connectTelegram();
                              }
                            }}
                            disabled={tgBusy}
                            className="font-mono text-sm"
                          />
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Get your token from @BotFather on Telegram
                            </div>
                            <Button 
                              onClick={connectTelegram} 
                              disabled={!tgToken || tgBusy}
                              className="shadow-sm"
                            >
                              {tgBusy ? (
                                <><svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>Connecting...</>
                              ) : (
                                <><svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>Connect Bot</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Workspaces Card */}
              <Card>
                <div className="border-b pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Workspaces
                  </h2>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{t.name ?? t.id}</td>
                          <td className="px-4 py-3">
                            <Badge variant={t.role === "owner" ? "success" : t.role === "admin" ? "default" : "muted"}>{t.role}</Badge>
                          </td>
                        </tr>
                      ))}
                      {tenants.length === 0 && (
                        <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">No workspaces</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Subscription Card */}
              <Card>
                <div className="border-b pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Subscription
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Status</span>
                      <Badge variant={billing?.active ? "success" : "warning"}>
                        {billing?.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <Badge variant="muted" className="font-medium">{getPlanLabel(billing?.plan)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Renews</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(billing?.renew)}</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t">
                  <Button onClick={openPortal} disabled={portalLoading} className="w-full shadow-sm">
                    {portalLoading ? "Opening..." : "Manage Billing"}
                  </Button>
                </div>
              </Card>

              {/* Payment Method Card */}
              <Card>
                <div className="border-b pb-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Payment Method
                  </h2>
                </div>
                {card ? (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 text-white shadow-lg mb-4">
                    <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Card on file</div>
                    <div className="text-lg font-semibold mb-1">{card.brand.toUpperCase()} •••• {card.last4}</div>
                    <div className="text-sm opacity-70">Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}</div>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg mb-4">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <div className="text-sm text-gray-500">No card on file</div>
                  </div>
                )}
                <Button variant="outline" onClick={openPortal} disabled={portalLoading} className="w-full shadow-sm">
                  {portalLoading ? "Opening..." : card ? "Update Card" : "Add Card"}
                </Button>
              </Card>
            </div>
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