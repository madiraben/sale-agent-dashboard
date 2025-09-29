"use client";

import Link from "next/link";
import { useMemo } from "react";
import { customers, orders, currency } from "@/data/mock";

export default function Customers() {
  const rows = useMemo(() => {
    return customers.map((c) => {
      const cs = orders.filter((o) => o.customerId === c.id);
      const total = cs.reduce((s, o) => s + o.total, 0);
      const last = cs.reduce<string | null>((acc, o) => (acc && acc > o.date ? acc : o.date), null);
      return { ...c, ordersCount: cs.length, total, lastDate: last };
    });
  }, []);

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
          <div className="relative hidden md:block">
            <input
              placeholder="Search"
              className="w-56 rounded-full border border-gray-300 bg-white px-9 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-[#3B82F6]"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
          </div>
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
              <th className="px-4 py-3">Last order</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, idx) => (
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
                <td className="px-4 py-3 text-gray-700">{r.lastDate ?? "-"}</td>
                <td className="px-4 py-3">{r.ordersCount}</td>
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
