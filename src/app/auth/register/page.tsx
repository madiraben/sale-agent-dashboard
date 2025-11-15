"use client";

import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import AuthCard from "@/components/auth-card";
import TextField from "@/components/ui/text-field";
import PasswordField from "@/components/ui/password-field";
import Button from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/loading-screen";
import { toast } from "react-toastify";
import BrandLogo from "@/components/ui/brand-logo";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = React.useMemo<SupabaseClient | null>(() => {
    if (typeof window === "undefined") return null;
    return createSupabaseBrowserClient();
  }, []);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [workspace, setWorkspace] = React.useState("");
  const [selectedLang, setSelectedLang] = React.useState<"EN" | "KM">("EN");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, [supabase, router]);

  const validateEmail = React.useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : "Enter a valid email.";
  }, []);

  const validatePassword = React.useCallback((value: string) => {
    if (!value || value.length < 8) return "Password must be at least 8 characters.";
    return null;
  }, []);

  const isFormValid = React.useMemo(() => {
    return !validateEmail(email) && !validatePassword(password);
  }, [email, password, validateEmail, validatePassword]);

  const onRegister = React.useCallback(async () => {
    if (!supabase) return;
    setError(null);
    setEmailError(validateEmail(email));
    setPasswordError(validatePassword(password));
    if (!isFormValid) return;
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      // After sign up, auth state will change; but we also attempt to bootstrap tenant when session exists
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        const { error: rpcErr } = await (supabase as any).rpc("bootstrap_tenant", { p_name: workspace || "My Workspace" });
        if (rpcErr) throw rpcErr;
        toast.success("Account created successfully");
        router.replace("/dashboard");
      } else {
        // If email confirmation is enabled, show message
        setError("Check your email to confirm your account.");
        toast.info("Check your email to confirm your account.");
      }
    } catch (e: any) {
      const generic = "Could not create account. Please try again.";
      const message = process.env.NODE_ENV !== "production" ? (e?.message ?? generic) : generic;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, workspace, isFormValid, router, supabase, validateEmail, validatePassword]);

  if (checkingSession)
    return (
      <LoadingScreen
        message="Preparing registration..."
        logoSrc="/images/logo/logo.png"
        backgroundClassName="bg-gradient-to-br from-cyan-50 to-purple-50"
        dotClassName="bg-gradient-to-r from-cyan-500 to-purple-600"
      />
    );

  return (
    <div className="min-h-dvh bg-[#EEF2F7]">
      <div className="mx-auto max-w-7xl px-6 pt-30">
        <BrandLogo width={96} height={32} priority />
      </div>
      <AuthCard>
        <div className="absolute right-4 top-4">
          <LanguageSwitcher value={selectedLang} onChange={setSelectedLang} />
        </div>

        <div className="mx-auto max-w-md">
          <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">Create your account</h1>

          <TextField label="Email*" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {emailError ? <div className="mt-1 text-sm text-rose-600">{emailError}</div> : null}

          <div className="mt-4" />
          <PasswordField label="Password*" placeholder="••••••••" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
          {passwordError ? <div className="mt-1 text-sm text-rose-600">{passwordError}</div> : null}

          <div className="mt-4" />
          <TextField label="Workspace Name" placeholder="Your shop or company" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />

          {error ? <div className="mt-3 text-sm text-rose-600">{error}</div> : null}

          <Button className="mt-6" fullWidth onClick={onRegister} disabled={loading || !isFormValid}>
            {loading ? "Creating..." : "Create Account"}
          </Button>

          <div className="mt-4 text-center text-sm text-gray-600">
            Already have an account? <button className="text-[#1E8BF7] hover:underline" onClick={() => router.push("/auth/login")}>Sign in</button>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}


