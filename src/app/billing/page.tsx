"use client";

import React from "react";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PublicBillingPage() {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-[#EEF2F7] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-2xl font-semibold text-gray-900">Pro Plan</h1>
          <p className="mt-2 text-sm text-gray-600">Unlock full access to inventory, orders, AI knowledge base, analytics and more.</p>
          <div className="mt-4 text-3xl font-bold text-gray-900">$20<span className="text-lg text-gray-600">/month</span></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Feature>Unlimited products and categories</Feature>
            <Feature>Unlimited orders and customers</Feature>
            <Feature>AI agent knowledge base</Feature>
            <Feature>Sales analytics and KPIs</Feature>
            <Feature>CSV import/export</Feature>
            <Feature>Priority support</Feature>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <PlanCard
              title="Monthly"
              priceLabel="$20"
              subLabel="/month"
              plan="monthly"
            />
            <PlanCard
              title="3 Months"
              priceLabel="$35"
              subLabel="/3 months"
              plan="quarterly"
            />
            <PlanCard
              title="Yearly"
              priceLabel="$180"
              subLabel="/year"
              plan="yearly"
            />
          </div>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Compare plans</h2>
            <table className="w-full text-left text-sm">
              <thead className="text-gray-600">
                <tr>
                  <th className="px-2 py-2">Feature</th>
                  <th className="px-2 py-2">Free</th>
                  <th className="px-2 py-2">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Products", "100", "Unlimited"],
                  ["Orders / month", "100", "Unlimited"],
                  ["AI Knowledge Base", "-", "Included"],
                  ["Analytics", "Basic", "Advanced"],
                  ["Priority Support", "-", "Included"],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td className="px-2 py-2 text-gray-800">{r[0]}</td>
                    <td className="px-2 py-2">{r[1]}</td>
                    <td className="px-2 py-2">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">FAQ</h2>
            <Faq q="Can I cancel anytime?" a="Yes, you can cancel in the Stripe customer portal and your plan remains active until the period ends." />
            <Faq q="Do you offer a trial?" a="Yes, you can start a trial during checkout. You won’t be charged until it ends." />
            <Faq q="What payment methods are supported?" a="All major cards via Stripe. More methods can be added per region." />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-800">
      <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-emerald-500" />
      <span>{children}</span>
    </div>
  );
}

// PlanCard rewritten to animate on click
function PlanCard({
  title,
  priceLabel,
  subLabel,
  plan
}: {
  title: string;
  priceLabel: string;
  subLabel: string;
  plan: string;
}) {
  const [loading, setLoading] = React.useState(false);
  const [dot, setDot] = React.useState(0);

  // Animate ... while loading
  React.useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setDot((d) => (d + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [loading]);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        // Could also show error here
      }
    } catch (err) {
      setLoading(false);
      // Could also show error here
    }
  };

  return (
    <div className="rounded-xl border p-4 transition-all duration-300">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">
        {priceLabel}
        <span className="text-sm text-gray-600">{subLabel}</span>
      </div>
      <Button
        className={`mt-3 w-full justify-center ${
          loading ? "opacity-75 pointer-events-none scale-95 animate-pulse" : ""
        }`}
        onClick={!loading ? handleClick : undefined}
        disabled={loading}
        aria-busy={loading}
      >
        {loading
          ? (
            <span className="inline-flex items-center">
              <svg className="mr-2 h-4 w-4 animate-spin text-emerald-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v2a6 6 0 00-6 6H4z"/>
              </svg>
              Redirecting{"." .repeat(dot)}
            </span>
            )
          : (`Choose ${title}`)}
      </Button>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-3 text-sm">
      <div className="font-medium text-gray-900">{q}</div>
      <div className="text-gray-600">{a}</div>
    </div>
  );
}

