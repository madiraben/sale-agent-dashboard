"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import AuthCard from "@/components/auth-card";
import LanguageSwitcher from "@/components/language-switcher";
import TextField from "@/components/ui/text-field";
import PasswordField from "@/components/ui/password-field";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/loading-screen";

export default function Page() {
  const [selectedLang, setSelectedLang] = useState<"EN" | "KM">("EN");
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Gate: show loading while checking session, to avoid flashing the login form
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
    // Also listen to auth state changes for instant redirect
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/dashboard");
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // Support either email or phone: Supabase's email/password is standard.
      // If phone number is given, you likely want OTP; for simplicity we treat input as email.
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneOrEmail,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <LoadingScreen  />;
  }

  return (
    <div className="min-h-dvh bg-[#EEF2F7]">
      {/* Top brand */}
      <div className="mx-auto max-w-7xl px-6 pt-30">
        <div className="relative h-8 w-20 md:h-10 md:w-24"></div>
      </div>

      {/* Card */}
      <AuthCard>
        <div className="absolute right-4 top-4">
          <LanguageSwitcher value={selectedLang} onChange={setSelectedLang} />
        </div>

        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-gray-100 text-gray-700">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.3 14.4c-1.8 1.1-4.4-1.5-5.5-3.3-1.1-1.8-2.7-4.4-1.6-5.5l1.5-1.5c.4-.4.4-1.1 0-1.6L8 1.3C7.6.9 6.9.9 6.5 1.3L4.4 3.4c-2 2 0 6 3 10s8 5 10 3l2.1-2.1c.4-.4.4-1.1 0-1.6l-1.2-1.2c-.4-.4-1.1-.4-1.6 0l-1.4 1.4z" />
            </svg>
          </div>

          <h1 className="mb-8 text-center text-2xl font-semibold text-gray-800">Sign in to your account</h1>

          <TextField
            label="Email*"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={phoneOrEmail}
            onChange={(e) => setPhoneOrEmail(e.target.value)}
            autoComplete="email"
            rightIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4h16v16H4z" />
                <path d="M4 6l8 6 8-6" />
              </svg>
            }
          />

          <div className="mt-5" />

          <PasswordField label="Password*" placeholder="••••••••" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} autoComplete="current-password" />

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

          <Button className="mt-6" fullWidth onClick={handleLogin} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="mb-5 mt-2 text-center text-sm text-gray-500">Don't have an account yet?</div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 12a9 9 0 1 1-9-9" />
                <path d="M21 3v7h-7" />
              </svg>
              Forgot password
            </Button>
          </div>
        </div>
      </AuthCard>

      {/* Footer note */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Image src="/images/logo/logo2.png" alt="brand" width={50} height={50} />
          <div>
            <div className="font-semibold">SALE AGENCY</div>
            <div>AI AGENT THAT CAN BE SALE REPRESENTATIVE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
