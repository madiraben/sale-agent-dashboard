"use client"
import { notFound, useParams } from "next/navigation";
import { currency } from "@/data/mock";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";
import React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Modal from "@/components/ui/modal";

export default function CustomerHistory() {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [customer, setCustomer] = React.useState<any | null | undefined>(undefined);
  const [history, setHistory] = React.useState<Array<{ id: string; date: string; total: number; status: string }>>([]);
  const [selectedOrder, setSelectedOrder] = React.useState<{ id: string; date: string; total: number; status: string } | null>(null);
  const [orderItems, setOrderItems] = React.useState<Array<{ name: string; qty: number; price: number }>>([]);
  const [itemsLoading, setItemsLoading] = React.useState(false);
  const { id } = useParams<{ id: string }>();

  React.useEffect(() => {
    async function load() {
      if (!id) return;
      const { data: c } = await supabase.from("customers").select("id,name,phone,email,address").eq("id", id).single();
      if (!c) return setCustomer(null);
      setCustomer(c);
      const { data: orders } = await supabase
        .from("orders")
        .select("id,date,total,status")
        .eq("customer_id", id)
        .order("date", { ascending: false });
      setHistory((orders as any) ?? []);
    }
    load();
  }, [id]);
  if (customer === undefined) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="text-gray-700">Loading...</div>
      </div>
    );
  }
  if (customer === null) return notFound();

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
                    const { data } = await supabase
                      .from("order_items")
                      .select("qty, price, products(name)")
                      .eq("order_id", o.id);
                    const mapped = ((data as any) ?? []).map((it: any) => ({ name: it.products?.name ?? "Unknown", qty: it.qty, price: it.price }));
                    setOrderItems(mapped);
                    setItemsLoading(false);
                  }}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{o.id}</td>
                  <td className="px-3 py-2">{o.date}</td>
                  <td className="px-3 py-2">{currency(o.total)}</td>
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
                <div className="text-base font-semibold text-gray-900">{currency(selectedOrder.total)}</div>
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
                        <td className="px-3 py-2">{currency(it.price)}</td>
                        <td className="px-3 py-2">{currency(it.price * it.qty)}</td>
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


