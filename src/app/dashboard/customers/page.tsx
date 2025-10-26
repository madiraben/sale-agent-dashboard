"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SearchInput from "@/components/ui/search-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CustomerWithStats, Currency } from "@/types";

export default function Customers() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supErr } = await supabase
        .from("customers_with_stats")
        .select("id,name,phone,email,address,last_date,orders_count,total")
        .order("name", { ascending: true });
      if (supErr) throw supErr;
      setRows((data as any) ?? []);
    } catch (e: any) {
      console.error("Failed to load customers", e?.message || e);
      setError(e?.message ?? "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Simple debounce for search input
  useEffect(() => {
    const t = setTimeout(() => setQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.name, r.phone, r.email ?? "", r.address ?? ""].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [query, rows]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      {/* Header with breadcrumb and actions (style only) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <span className="text-gray-700">Customers</span>
          <span>›</span>
          <span className="font-medium text-gray-900">List</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button
            aria-label="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={() => loadCustomers()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </button>
          <button aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="py-24 text-center text-sm text-gray-500">Loading customers…</div>
        ) : error ? (
          <div className="py-24 text-center text-sm text-red-500">{error}</div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-y border-gray-200 text-gray-600">
                <th className="px-4 py-3 w-14">No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Last order</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/customers/${r.id}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">View history</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{r.phone}</div>
                    <div className="text-xs text-gray-500">{r.email ?? "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.address ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{r.last_date ?? "-"}</td>
                  <td className="px-4 py-3">{r.orders_count}</td>
                  <td className="px-4 py-3">{Currency(r.total as number)}</td>
                  <td className="px-4 py-3">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100" aria-label="More">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
