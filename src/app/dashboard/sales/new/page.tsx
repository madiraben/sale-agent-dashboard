"use client";

import React from "react";
import Link from "next/link";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import Button from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import { currency } from "@/data/mock";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Product = { id: string; name: string; price: number; stock?: number };
type Customer = { id: string; name: string; phone: string; email?: string };

export default function NewOrderPage() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  // Data options
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);

  // Customer selection/creation
  const [useNewCustomer, setUseNewCustomer] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [customerSearch, setCustomerSearch] = React.useState("");

  // Cart items
  const [itemRows, setItemRows] = React.useState<Array<{ product_id: string; name: string; price: number; qty: number; stock?: number }>>([]);
  const [productSearch, setProductSearch] = React.useState("");

  // Status and submit
  const [orderStatus, setOrderStatus] = React.useState<"pending" | "paid" | "refunded">("pending");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.from("customers").select("id,name,phone,email").order("name", { ascending: true }).then(({ data }) => setCustomers((data as any) ?? []));
    supabase.from("products").select("id,name,price,stock").order("name", { ascending: true }).then(({ data }) => setProducts((data as any) ?? []));
  }, []);

  const filteredCustomers = React.useMemo(() => {
    const s = customerSearch.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => [c.name, c.phone, c.email ?? ""].some((v) => v.toLowerCase().includes(s)));
  }, [customerSearch, customers]);

  const filteredProducts = React.useMemo(() => {
    const s = productSearch.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => [p.name].some((v) => v.toLowerCase().includes(s)));
  }, [productSearch, products]);

  function addProductToCart(p: Product) {
    setItemRows((prev) => {
      const existingIdx = prev.findIndex((r) => r.product_id === p.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 };
        return next;
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, qty: 1, stock: p.stock }];
    });
  }

  function updateQty(idx: number, qty: number) {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, qty: Math.max(1, qty) } : r)));
  }
  function updatePrice(idx: number, price: number) {
    setItemRows((prev) => prev.map((r, i) => (i === idx ? { ...r, price: Math.max(0, price) } : r)));
  }
  function removeRow(idx: number) {
    setItemRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = React.useMemo(() => itemRows.reduce((s, r) => s + r.qty * r.price, 0), [itemRows]);

  async function submitOrder() {
    setMessage(null);
    if (!useNewCustomer && !selectedCustomerId) {
      setMessage("Select a customer or create a new one");
      return;
    }
    if (useNewCustomer && (!newName.trim() || !newPhone.trim())) {
      setMessage("Enter name and phone for the new customer");
      return;
    }
    if (itemRows.length === 0) {
      setMessage("Add at least one product");
      return;
    }
    setSaving(true);
    try {
      let customerId = selectedCustomerId;
      if (useNewCustomer) {
        const { data: c, error: cErr } = await supabase
          .from("customers")
          .insert({ name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() || null, address: newAddress.trim() || null })
          .select("id")
          .single();
        if (cErr || !c) throw cErr;
        customerId = (c as any).id;
      }
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({ customer_id: customerId, status: orderStatus, total })
        .select("id")
        .single();
      if (oErr || !order) throw oErr;
      const orderId = (order as any).id;
      const payload = itemRows.map((r) => ({ order_id: orderId, product_id: r.product_id, qty: r.qty, price: r.price }));
      const { error: iErr } = await supabase.from("order_items").insert(payload);
      if (iErr) throw iErr;
      setMessage("Order placed successfully");
      setItemRows([]);
      setSelectedCustomerId("");
      setUseNewCustomer(false);
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewAddress("");
      setOrderStatus("pending");
    } catch (e: any) {
      setMessage(e?.message ?? "Failed to place order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/dashboard/sales" className="text-gray-700 hover:underline">Sales</Link>
          <span>›</span>
          <span className="font-medium text-gray-900">New Order</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Customer + Products */}
        <div className="space-y-6">
          {/* Customer block */}
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Customer</div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={useNewCustomer} onChange={(e) => setUseNewCustomer(e.target.checked)} />
                Create new
              </label>
            </div>
            {useNewCustomer ? (
              <div className="grid gap-3">
                <TextField placeholder="Full name *" value={newName} onChange={(e) => setNewName(e.target.value)} />
                <TextField placeholder="Phone *" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <TextField placeholder="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <TextArea rows={3} placeholder="Address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
              </div>
            ) : (
              <div className="grid gap-2">
                <SearchInput placeholder="Search customers" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                  <option value="">— Select customer —</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} • {c.phone}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Products block */}
          <div className="rounded-lg border p-4">
            <div className="mb-3 text-sm font-semibold text-gray-900">Products</div>
            <div className="mb-2">
              <SearchInput placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-auto rounded border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 text-gray-900">{p.name}</td>
                      <td className="px-3 py-2">{currency(p.price)}</td>
                      <td className="px-3 py-2">{p.stock ?? "-"}</td>
                      <td className="px-3 py-2">
                        <Button variant="outline" onClick={() => addProductToCart(p)}>Add</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No products</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Cart + Submit */}
        <div className="space-y-6">
          <div className="rounded-lg border p-4">
            <div className="mb-2 text-sm font-semibold text-gray-900">Cart</div>
            <div className="rounded border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 w-20">Qty</th>
                    <th className="px-3 py-2 w-28">Price</th>
                    <th className="px-3 py-2 w-28">Subtotal</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {itemRows.map((r, idx) => (
                    <tr key={r.product_id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{r.name}</div>
                        {typeof r.stock === "number" ? <div className="text-xs text-gray-500">In stock: {r.stock}</div> : null}
                      </td>
                      <td className="px-3 py-2">
                        <TextField type="number" value={String(r.qty)} onChange={(e) => updateQty(idx, Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2">
                        <TextField type="number" value={String(r.price)} onChange={(e) => updatePrice(idx, Number(e.target.value))} />
                      </td>
                      <td className="px-3 py-2">{currency(r.qty * r.price)}</td>
                      <td className="px-3 py-2"><button className="text-sm text-rose-600" onClick={() => removeRow(idx)}>Remove</button></td>
                    </tr>
                  ))}
                  {itemRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No items yet</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-base font-semibold">
              <div>Total</div>
              <div>{currency(total)}</div>
            </div>
            <div className="mt-4">
              <div className="mb-1 text-sm text-gray-700">Order status</div>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value as any)}>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="refunded">refunded</option>
              </select>
            </div>
          </div>
          {message ? <div className="text-sm text-gray-700">{message}</div> : null}
          <div className="flex items-center gap-2">
            <Button onClick={submitOrder} disabled={saving}>{saving ? "Placing..." : "Place Order"}</Button>
            <Link href="/dashboard/sales" className="text-sm text-gray-600 hover:underline">Back to orders</Link>
          </div>
        </div>
      </div>
    </div>
  );
}


