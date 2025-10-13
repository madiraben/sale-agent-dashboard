"use client";

import Link from "next/link";
import { useMemo } from "react";
import { currency } from "@/data/mock";
import SearchInput from "@/components/ui/search-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import React from "react";

export default function Customers() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [q, setQ] = React.useState("");
  const debouncedSetQ = React.useMemo(() => {
    let t: any;
    return (v: string) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setQ(v), 200);
    };
  }, []);
  const [rows, setRows] = React.useState<Array<{ id: string; name: string; phone: string; email?: string; address?: string | null; last_date: string | null; orders_count: number; total: number }>>([]);

  React.useEffect(() => {
    // Load customers with order aggregates from view
    async function load() {
      const { data } = await supabase
        .from("customers_with_stats")
        .select("id,name,phone,email,address,last_date,orders_count,total")
        .order("name", { ascending: true });
      if (data) setRows(data as any);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [r.name, r.phone, r.email ?? "", r.address ?? ""].some((v) => v.toLowerCase().includes(s)));
  }, [q, rows]);

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
          <SearchInput className="hidden md:block" value={q} onChange={(e) => debouncedSetQ(e.target.value)} />
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
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
                <td className="px-4 py-3">{currency(r.total)}</td>
                <td className="px-4 py-3">
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100">
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
      </div>
    </div>
  );
}
