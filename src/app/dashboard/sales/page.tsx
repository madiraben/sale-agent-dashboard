"use client";

import React from "react";
import Link from "next/link";
import { Currency } from "@/types";
import SearchInput from "@/components/ui/search-input";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  total: number;
  status: "paid" | "refunded" | "pending";
  items?: Array<{ name: string; qty: number; price: number }>;
};

export default function Sales() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [q, setQ] = React.useState("");
  const debouncedSetQ = React.useMemo(() => {
    let t: any;
    return (v: string) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setQ(v), 200);
    };
  }, []);
  const [selectedRow, setSelectedRow] = React.useState<Row | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const ITEMS_PER_PAGE = 15;

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      // Get user's tenant_id first
      const { data: userTenant } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .limit(1)
        .single();

      const tenantId = userTenant?.tenant_id;
      
      if (!tenantId) {
        console.error("No tenant_id found for user");
        setRows([]);
        setTotalCount(0);
        return;
      }

      // Calculate pagination range
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Fetch total count and paginated orders filtered by tenant_id
      const { data: orders, count } = await supabase
        .from("orders")
        .select("id, customer_id, date, status, total, customers(name), tenant_id", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false })
        .range(from, to);

      if (count !== null) {
        setTotalCount(count);
      }

      const ids = (orders as any)?.map((o: any) => o.id) ?? [];
      let itemsByOrder: Record<string, Array<{ name: string; qty: number; price: number }>> = {};
      if (ids.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, qty, price, products(name)")
          .in("order_id", ids);
        for (const it of (items as any) ?? []) {
          const arr = itemsByOrder[it.order_id] ?? (itemsByOrder[it.order_id] = []);
          arr.push({ name: it.products?.name ?? "Unknown", qty: it.qty, price: it.price });
        }
      }
      const mapped: Row[] = ((orders as any) ?? []).map((o: any) => ({
        id: o.id,
        customerId: o.customer_id,
        customerName: o.customers?.name ?? "Unknown",
        date: o.date,
        total: o.total,
        status: o.status,
        items: itemsByOrder[o.id] ?? [],
      }));
      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, ITEMS_PER_PAGE]);

  React.useEffect(() => {
    loadOrders();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.id, r.customerName, r.status, r.date].some((v) => v.toString().toLowerCase().includes(s))
    );
  }, [q, rows]);

  const grandTotal = React.useMemo(() => filtered.reduce((sum, r) => sum + r.total, 0), [filtered]);
  
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  async function setOrderStatus(orderId: string, next: Row["status"]) {
    try {
      setSavingId(orderId);
      // when accepting, call RPC to decrement stock transactionally
      let error: any = null;
      if (next === "paid") {
        const { error: rpcError } = await (supabase as any).rpc("accept_order", { p_order_id: orderId });
        error = rpcError;
      } else {
        const res = await supabase.from("orders").update({ status: next }).eq("id", orderId);
        error = res.error;
      }
      // optimistic UI only after success to avoid stock mismatch
      if (!error) {
        setRows((prev) => prev.map((r) => (r.id === orderId ? { ...r, status: next } : r)));
        if (selectedRow?.id === orderId) {
          setSelectedRow({ ...selectedRow, status: next });
        }
      }
      if (error) {
        throw error;
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <span className="text-gray-700">Sales</span>
          <span>›</span>
          <span className="font-bold text-gray-900">All Orders</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" placeholder="Search orders" value={q} onChange={(e) => debouncedSetQ(e.target.value)} />
          <Button 
            variant="outline" 
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={loading ? "animate-spin" : ""}
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Link href="/dashboard/sales/new">
            <Button>New Order</Button>
          </Link>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          {q ? (
            <>
              Showing {filtered.length} of {totalCount} orders
            </>
          ) : (
            <>
              Total orders: <span className="font-semibold text-gray-900">{totalCount}</span>
              {totalPages > 1 && (
                <span className="ml-2 text-gray-500">
                  (Page {currentPage} of {totalPages})
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-gray-600">Page total: <span className="font-bold text-gray-900">{Currency(grandTotal)}</span></div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-y-2 text-gray-700 font-semibold" style={{ borderImage: "linear-gradient(90deg, var(--brand-start), var(--brand-end)) 1" }}>
              <th className="px-4 py-3 w-20">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-brand-subtle cursor-pointer transition-colors"
                onClick={() => setSelectedRow(r)}
              >
                <td className="px-4 py-3 font-semibold text-gray-900">{r.id}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/customers/${r.customerId}`}
                    className="font-medium text-gray-900 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.customerName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.date}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={r.status === "paid" ? "success" : r.status === "pending" ? "warning" : "danger"}
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{Currency(r.total)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {r.status === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          disabled={savingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderStatus(r.id, "paid");
                          }}
                        >
                          {savingId === r.id ? "Saving..." : "Accept"}
                        </Button>
                        <Button
                          variant="outline"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          disabled={savingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderStatus(r.id, "refunded");
                          }}
                        >
                          {savingId === r.id ? "Saving..." : "Decline"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
            className="px-3 py-1.5"
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Show first page, last page, current page, and pages around current
              const showPage =
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 2 && pageNum <= currentPage + 2);
              
              // Show ellipsis
              const showEllipsisBefore = pageNum === currentPage - 3 && currentPage > 4;
              const showEllipsisAfter = pageNum === currentPage + 3 && currentPage < totalPages - 3;

              if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                return null;
              }

              if (showEllipsisBefore || showEllipsisAfter) {
                return (
                  <span key={pageNum} className="px-2 text-gray-400">
                    ...
                  </span>
                );
              }

              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "primary" : "outline"}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className="min-w-[40px] px-3 py-1.5"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      )}

      {selectedRow ? (
        <OrderDetailDialog
          row={selectedRow}
          open={true}
          busy={savingId === selectedRow.id}
          onOpenChange={(o) => {
            if (!o) setSelectedRow(null);
          }}
          onAccept={() => setOrderStatus(selectedRow.id, "paid")}
          onDecline={() => setOrderStatus(selectedRow.id, "refunded")}
        />
      ) : null}
    </div>
  );
}

function OrderDetailDialog({ row, open, onOpenChange, onAccept, onDecline, busy }: { row: Row; open: boolean; onOpenChange: (open: boolean) => void; onAccept: () => void; onDecline: () => void; busy: boolean }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={<>Order {row.id}</>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-500">Customer</div>
            <div className="font-semibold text-gray-900">{row.customerName}</div>
          </div>
          <div>
            <div className="text-gray-500">Date</div>
            <div className="font-semibold text-gray-900">{row.date}</div>
          </div>
        </div>
        <div>
          <div className="mb-2 font-medium text-gray-700">Items</div>
          <div className="rounded-lg border-2 bg-brand-subtle" style={{ borderImage: "linear-gradient(135deg, var(--brand-start), var(--brand-end)) 1" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 text-gray-700 font-semibold" style={{ borderImage: "linear-gradient(90deg, var(--brand-start), var(--brand-end)) 1" }}>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(row.items ?? []).map((it, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-medium text-gray-900">{it.name}</td>
                    <td className="px-3 py-2 text-gray-700">{it.qty}</td>
                    <td className="px-3 py-2 text-gray-700">{Currency(it.price)}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900">{Currency(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-end gap-6">
          <div className="font-medium text-gray-700">Total</div>
          <div className="text-base font-bold text-gray-900">{Currency(row.total)}</div>
        </div>
        {row.status === "pending" ? (
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={busy} onClick={onAccept}>{busy ? "Saving..." : "Accept"}</Button>
            <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" disabled={busy} onClick={onDecline}>{busy ? "Saving..." : "Decline"}</Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
