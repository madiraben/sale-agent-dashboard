"use client";

import React from "react";
import AuthCard from "@/components/auth-card";
import TextField from "@/components/ui/text-field";
import Button from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/loading-screen";
import { toast } from "react-toastify";
import BrandLogo from "@/components/ui/brand-logo";

export default function ForgetPasswordPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [selectedLang, setSelectedLang] = React.useState<"EN" | "KM">("EN");
  const [loading, setLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    });
  }, []);

  const validateEmail = React.useCallback((value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : "Enter a valid email.";
  }, []);

  const onSubmit = React.useCallback(async () => {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      // Avoid user enumeration: always show generic success
      toast.info("If an account exists, we sent a reset link to your email.");
      router.replace("/auth/login");
    } catch (e: any) {
      const generic = "If an account exists, we sent a reset link to your email.";
      const message = process.env.NODE_ENV !== "production" ? (e?.message ?? generic) : generic;
      toast.info(message);
    } finally {
      setLoading(false);
    }
  }, [email, router, supabase, validateEmail]);

  if (checkingSession) return <LoadingScreen message="Preparing password reset..." />;

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
          <h1 className="mb-6 text-center text-2xl font-semibold text-gray-800">Reset your password</h1>

          <TextField label="Email*" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {emailError ? <div className="mt-1 text-sm text-rose-600">{emailError}</div> : null}

          <Button className="mt-6" fullWidth onClick={onSubmit} disabled={loading || !!validateEmail(email)}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>

          <div className="mt-4 text-center text-sm text-gray-600">
            Remembered your password? <button className="text-[#1E8BF7] hover:underline" onClick={() => router.push("/auth/login")}>Back to sign in</button>
          </div>
        </div>
      </AuthCard>
    </div>
  );
}


