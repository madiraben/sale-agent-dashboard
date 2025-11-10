"use client"
import { useParams, usePathname } from "next/navigation";
import { Customer, Order, Currency } from "@/types";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import LoadingScreen from "@/components/loading-screen";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CustomerHistory() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { id: paramId } = useParams<{ id?: string }>();
  const pathname = usePathname();
  const id = useMemo(() => {
    if (typeof paramId === "string" && paramId.length > 0) return paramId;
    // Fallback: extract last segment from pathname /dashboard/customers/[id]
    if (typeof pathname === "string") {
      const seg = pathname.split("/").filter(Boolean).pop();
      return seg ?? "";
    }
    return "";
  }, [paramId, pathname]);

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [history, setHistory] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  type DisplayOrderItem = { name: string; qty: number; price: number };
  const [orderItems, setOrderItems] = useState<DisplayOrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const loadCustomerAndOrders = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    setError(null);
    try {
      const { data: c, error: cErr } = await supabase
        .from("customers")
        .select("id,name,phone,email,address")
        .eq("id", id)
        .single();
      if (cErr) throw cErr;
      if (!c) { if (isMounted.current) setCustomer(null); return; }
      if (isMounted.current) setCustomer(c as Customer);

      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id,date,total,status")
        .eq("customer_id", id)
        .order("date", { ascending: false });
      if (oErr) throw oErr;
      if (isMounted.current) setHistory((orders as any) ?? []);
    } catch (e: any) {
      console.error("Failed to load customer/history", e?.message || e);
      if (isMounted.current) { setError(e?.message ?? "Failed to load"); setCustomer(null); }
    }
  }, [id, supabase]);

  useEffect(() => { loadCustomerAndOrders(); }, [loadCustomerAndOrders]);

  if (customer === undefined) return <LoadingScreen />;
  if (customer === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customer not found</h2>
            <p className="text-sm text-gray-600">The requested customer does not exist or was removed.</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard/customers")}>Back to customers</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{customer.name}</h2>
          <p className="text-sm text-gray-600">
            {customer.phone} {customer.email ? `• ${customer.email}` : ""}
          </p>
          {customer.address ? (
            <p className="text-sm text-gray-600">{customer.address}</p>
          ) : null}
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/customers")}>
          Back to customers
        </Button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Order history</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={async () => {
                    setSelectedOrder(o);
                    setItemsLoading(true);
                    try {
                      const { data, error: iErr } = await supabase
                        .from("order_items")
                        .select("qty, price, products(name)")
                        .eq("order_id", o.id);
                      if (iErr) throw iErr;
                      const mapped = ((data as any) ?? []).map((it: any) => ({ name: it.products?.name ?? "Unknown", qty: it.qty, price: it.price }));
                      setOrderItems(mapped);
                    } catch (e: any) {
                      console.error("Failed to load order items", e?.message || e);
                      setOrderItems([]);
                    } finally {
                      setItemsLoading(false);
                    }
                  }}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{o.id}</td>
                  <td className="px-3 py-2">{o.date}</td>
                  <td className="px-3 py-2">{Currency(o.total as number)}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                    No orders yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {selectedOrder ? (
        <Modal
          open={true}
          onOpenChange={(o) => { if (!o) { setSelectedOrder(null); setOrderItems([]); } }}
          title={<>Order {selectedOrder.id}</>}
          widthClassName="max-w-2xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Date</div>
                <div className="text-gray-900">{selectedOrder.date}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-500">Total</div>
                <div className="text-base font-semibold text-gray-900">{Currency(selectedOrder.total)}</div>
              </div>
            </div>
            <div className="rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Loading items...</td></tr>
                  ) : (
                    orderItems.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="px-3 py-2">{it.qty}</td>
                        <td className="px-3 py-2">{Currency(it.price)}</td>
                        <td className="px-3 py-2">{Currency(it.price * it.qty)}</td>
                      </tr>
                    ))
                  )}
                  {!itemsLoading && orderItems.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No items</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}


