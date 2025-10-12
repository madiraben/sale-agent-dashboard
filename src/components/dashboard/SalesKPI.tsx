"use client";

import React from "react";
import { currency } from "@/data/mock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Range = {
  label: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getPresetRange(preset: "today" | "this_week" | "last_week" | "this_month"): Range {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const mondayOffset = (day + 6) % 7; // 0=Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  if (preset === "today") {
    return { label: "Today", start: formatDate(today), end: formatDate(today) };
  }
  if (preset === "this_week") {
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { label: "This Week", start: formatDate(monday), end: formatDate(sunday) };
  }
  if (preset === "last_week") {
    const lastMon = new Date(monday); lastMon.setDate(monday.getDate() - 7);
    const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6);
    return { label: "Last Week", start: formatDate(lastMon), end: formatDate(lastSun) };
  }
  // this_month
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { label: "This Month", start: formatDate(first), end: formatDate(last) };
}

export default function SalesKPI() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [todayTotal, setTodayTotal] = React.useState<number>(0);
  const [thisWeekTotal, setThisWeekTotal] = React.useState<number>(0);
  const [lastWeekTotal, setLastWeekTotal] = React.useState<number>(0);
  const [thisMonthTotal, setThisMonthTotal] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(true);

  async function loadPresets() {
    setLoading(true);
    const ranges: Array<{ key: string; r: Range }> = [
      { key: "today", r: getPresetRange("today") },
      { key: "this_week", r: getPresetRange("this_week") },
      { key: "last_week", r: getPresetRange("last_week") },
      { key: "this_month", r: getPresetRange("this_month") },
    ];
    const results = await Promise.all(
      ranges.map(({ r }) => supabase.rpc("sales_total_between", { p_start: r.start, p_end: r.end }))
    );
    setTodayTotal(Number(results[0].data ?? 0));
    setThisWeekTotal(Number(results[1].data ?? 0));
    setLastWeekTotal(Number(results[2].data ?? 0));
    setThisMonthTotal(Number(results[3].data ?? 0));
    setLoading(false);
  }

  React.useEffect(() => { loadPresets(); }, []);


  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-gray-600">Today</div>
          <div className="text-xl font-semibold text-gray-900">{loading ? "—" : currency(todayTotal)}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-gray-600">This Week</div>
          <div className="text-xl font-semibold text-gray-900">{loading ? "—" : currency(thisWeekTotal)}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-gray-600">Last Week</div>
          <div className="text-xl font-semibold text-gray-900">{loading ? "—" : currency(lastWeekTotal)}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-gray-600">This Month</div>
          <div className="text-xl font-semibold text-gray-900">{loading ? "—" : currency(thisMonthTotal)}</div>
        </div>
      </div>

      {/* Custom date picker removed per request */}
    </div>
  );
}


