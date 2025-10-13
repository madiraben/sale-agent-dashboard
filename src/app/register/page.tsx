"use client";

import React from "react";
import AuthCard from "@/components/auth-card";
import TextField from "@/components/ui/text-field";
import PasswordField from "@/components/ui/password-field";
import Button from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/loading-screen";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [workspace, setWorkspace] = React.useState("");
  const [selectedLang, setSelectedLang] = React.useState<"EN" | "KM">("EN");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, []);

  async function onRegister() {
    setError(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      // After sign up, auth state will change; but we also attempt to bootstrap tenant when session exists
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { error: rpcErr } = await (supabase as any).rpc("bootstrap_tenant", { p_name: workspace || "My Workspace" });
        if (rpcErr) throw rpcErr;
        router.replace("/dashboard");
      } else {
        // If email confirmation is enabled, show message
        setError("Check your email to confirm your account.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) return <LoadingScreen message="Preparing registration..." />;

  return (
    <div className="min-h-dvh bg-[#EEF2F7]">
      <AuthCard>
        <div className="absolute right-4 top-4">
          <LanguageSwitcher value={selectedLang} onChange={setSelectedLang} />
        </div>

        <div className="mx-auto max-w-md">
          <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">Create your account</h1>

          <TextField label="Email*" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <div className="mt-4" />
          <PasswordField label="Password*" placeholder="••••••••" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />

          <div className="mt-4" />
          <TextField label="Workspace Name" placeholder="Your shop or company" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />

          {error ? <div className="mt-3 text-sm text-rose-600">{error}</div> : null}

          <Button className="mt-6" fullWidth onClick={onRegister} disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account? <button className="text-[#1E8BF7] hover:underline" onClick={() => router.push("/login")}>Sign in</button>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}


