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

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  type DisplayOrderItem = { name: string; qty: number; price: number };
  const [orderItems, setOrderItems] = useState<DisplayOrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomerAndOrders = useCallback(async () => {
    if (!id || typeof id !== "string" || id.length === 0) {
      return;
    }
    
    console.log("Loading customer with ID:", id);
    setLoading(true);
    setError(null);
    
    try {
      // Get user's tenant_id first
      const { data: userTenant } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .limit(1)
        .single();

      const tenantId = userTenant?.tenant_id;
      
      if (!tenantId) {
        throw new Error("No tenant_id found for user");
      }

      console.log("Fetching customer for tenant:", tenantId);
      
      const { data: c, error: cErr } = await supabase
        .from("customers")
        .select("id,name,phone,email,address")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();
        
      console.log("Customer data:", c, "Error:", cErr);
      
      if (cErr) throw cErr;
      if (!c) { 
        setCustomer(null);
        setLoading(false);
        return;
      }
      
      setCustomer(c as Customer);

      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id,date,total,status")
        .eq("customer_id", id)
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false });
        
      if (oErr) throw oErr;
      setHistory((orders as any) ?? []);
      
      console.log("Data loaded successfully");
    } catch (e: any) {
      console.error("Failed to load customer/history", e?.message || e);
      setError(e?.message ?? "Failed to load"); 
      setCustomer(null); 
    } finally {
      setLoading(false);
      console.log("Loading complete");
    }
  }, [id, supabase]);

  useEffect(() => { loadCustomerAndOrders(); }, [loadCustomerAndOrders]);

  if (loading) return <LoadingScreen />;
  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Customer not found</h2>
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
          <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm border-2 border-black">
            <thead className="table-header-gradient text-white font-semibold">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-gray-100 cursor-pointer"
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
                  <td className="px-3 py-2 font-semibold text-black">{o.id}</td>
                  <td className="px-3 py-2 text-black">{o.date}</td>
                  <td className="px-3 py-2 font-semibold text-black">{Currency(o.total as number)}</td>
                  <td className="px-3 py-2 capitalize text-black">{o.status}</td>
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
          onOpenChange={(o) => {
            if (!o) {
              setSelectedOrder(null);
              setOrderItems([]);
            }
          }}
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
                <div className="text-base font-bold text-gray-900">{Currency(selectedOrder.total)}</div>
              </div>
            </div>
            <div className="rounded-lg border-2 border-black bg-white">
              <table className="w-full text-left text-sm bg-white rounded-lg overflow-hidden">
                <thead className="table-header-gradient text-white font-semibold">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-200 bg-white">
                        Loading items...
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((it, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-100 border-t border-gray-800"}
                      >
                        <td className="px-3 py-2 font-medium text-black">{it.name}</td>
                        <td className="px-3 py-2 text-black">{it.qty}</td>
                        <td className="px-3 py-2 text-black">{Currency(it.price)}</td>
                        <td className="px-3 py-2 font-semibold text-black">{Currency(it.price * it.qty)}</td>
                      </tr>
                    ))
                  )}
                  {!itemsLoading && orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-400 bg-white">
                        No items
                      </td>
                    </tr>
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

