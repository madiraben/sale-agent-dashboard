"use client";

import React from "react";
import Card from "@/components/ui/card";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import PasswordField from "@/components/ui/password-field";
import ImageUploader from "@/components/ui/image-uploader";
import LanguageSwitcher from "@/components/language-switcher";
import Button from "@/components/ui/button";
import Link from "next/link";

export default function Setting() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatar, setAvatar] = React.useState<File | null>(null);
  const [language, setLanguage] = React.useState<"EN" | "KM">("EN");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [fbConnected, setFbConnected] = React.useState<{ id: string | null; name: string | null } | null>(null);
  const [fbPages, setFbPages] = React.useState<Array<{ id: string; name: string }>>([]);
  const [fbLoading, setFbLoading] = React.useState(false);

  function handleSaveProfile() {
      // TODO: integrate with API
    console.log({ name, email, bio, avatar });
  }

  function handleSavePreferences() {
    // TODO: integrate with API
    console.log({ language });
  }

  function handleChangePassword() {
    // TODO: integrate with API
    if (newPassword !== confirmPassword) return;
    console.log({ password, newPassword });
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  React.useEffect(() => {
    async function loadFb() {
      try {
        setFbLoading(true);
        const [cRes, pRes] = await Promise.all([
          fetch("/api/facebook/connected").then((r) => r.json()),
          fetch("/api/facebook/pages").then((r) => r.json()),
        ]);
        setFbConnected(cRes);
        const pages = Array.isArray(pRes?.pages) ? pRes.pages.map((p: any) => ({ id: p.id, name: p.name })) : [];
        setFbPages(pages);
      } catch {
        // swallow
      } finally {
        setFbLoading(false);
      }
    }
    loadFb();
  }, []);

  async function connectPage(pageId: string) {
    if (!pageId) return;
    setFbLoading(true);
    try {
      const r = await fetch("/api/facebook/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page_id: pageId }) });
      if (r.ok) {
        const j = await r.json();
        setFbConnected({ id: j?.page?.id ?? pageId, name: j?.page?.name ?? null });
      }
    } finally {
      setFbLoading(false);
    }
  }

  async function disconnectPage() {
    setFbLoading(true);
    try {
      await fetch("/api/facebook/connected", { method: "DELETE" });
      setFbConnected({ id: null, name: null });
    } finally {
      setFbLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
          <span className="text-gray-700">Settings</span>
          <span>›</span>
          <span className="font-medium text-gray-900">Account</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 text-base font-semibold text-gray-900">Profile</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:row-span-2">
              <div className="mb-2 text-sm text-gray-600">Avatar</div>
              <ImageUploader value={avatar} onChange={setAvatar} circle size={128} />
            </div>
            <TextField label="Full name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Email" placeholder="john@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="md:col-span-2">
              <TextArea label="Bio" rows={4} placeholder="Tell us about yourself" value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveProfile}>Save profile</Button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 text-base font-semibold text-gray-900">Preferences</div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm text-gray-700">Language</div>
              <LanguageSwitcher value={language} onChange={setLanguage} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={handleSavePreferences}>Save preferences</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-4 text-base font-semibold text-gray-900">Facebook</div>
        {fbConnected?.id ? (
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-gray-700">Connected Page: <span className="font-medium text-gray-900">{fbConnected.name || fbConnected.id}</span></div>
            <Button variant="outline" onClick={disconnectPage} disabled={fbLoading}>Disconnect</Button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">Connect your Facebook Page to enable the Messenger bot.</div>
              <Link href="/api/facebook/oauth/start" className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                Connect Facebook Page
              </Link>
            </div>
            {fbPages.length > 0 ? (
              <div className="rounded-md border">
                <div className="border-b bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">Your Pages</div>
                <ul className="divide-y">
                  {fbPages.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="text-gray-800">{p.name}</div>
                      <Button onClick={() => connectPage(p.id)} disabled={fbLoading}>Connect</Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <div className="mb-4 text-base font-semibold text-gray-900">Security</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <PasswordField label="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordField label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleChangePassword}>Change password</Button>
        </div>
      </Card>
    </div>
  );
}
