"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import SearchInput from "@/components/ui/search-input";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import IconButton from "@/components/ui/icon-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CustomerWithStats, Currency } from "@/types";

export default function Customers() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState<CustomerWithStats | null>(null);

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

  const handleDelete = useCallback(
    async (row: CustomerWithStats) => {
      // Called from confirmation dialog
      setDeletingId(row.id);
      setError(null);
      try {
        const { error: supErr } = await supabase.from("customers").delete().eq("id", row.id);
        if (supErr) throw supErr;
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setConfirmOpen(false);
        setConfirmRow(null);
      } catch (e: any) {
        console.error("Failed to delete customer", e?.message || e);
        setError(e?.message ?? "Failed to delete customer");
      } finally {
        setDeletingId(null);
      }
    },
    [supabase]
  );

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
          <IconButton aria-label="Refresh" onClick={() => loadCustomers()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </IconButton>
          <IconButton aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </IconButton>
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
                    <IconButton round className="h-8 w-8" aria-label="More">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </IconButton>
                    <IconButton
                      className="ml-1 h-8 w-8 border-rose-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Delete"
                      onClick={() => {
                        setConfirmRow(r);
                        setConfirmOpen(true);
                      }}
                      disabled={deletingId === r.id || loading}
                      title={deletingId === r.id ? "Deleting..." : "Delete customer and all orders"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18" />
                        <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete customer"
        description={
          confirmRow ? (
            <div>
              Are you sure you want to delete <span className="font-medium">"{confirmRow.name}"</span> and all of their orders? This action cannot be undone.
            </div>
          ) : null
        }
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        busy={!!deletingId}
        onCancel={() => {
          if (deletingId) return;
          setConfirmOpen(false);
          setConfirmRow(null);
        }}
        onConfirm={() => {
          if (confirmRow) handleDelete(confirmRow);
        }}
      />
    </div>
  );
}
