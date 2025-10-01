"use client";

import React from "react";
import Link from "next/link";
import { products, currency } from "@/data/mock";
import SearchInput from "@/components/ui/search-input";
import Button from "@/components/ui/button";
import SideDrawer from "@/components/ui/side-drawer";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import ImageUploader from "@/components/ui/image-uploader";

export default function Product() {
  const [q, setQ] = React.useState("");
  const [openAdd, setOpenAdd] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState<null | string>(null);
  const rows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) =>
      [p.name, p.sku, p.category].some((v) => (v ?? "").toLowerCase().includes(s))
    );
  }, [q]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <span className="text-gray-700">Products</span>
          <span>›</span>
          <span className="font-medium text-gray-900">List</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button className="gap-2" onClick={() => setOpenAdd(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-y border-gray-200 text-gray-600">
              <th className="px-4 py-3 w-14">No.</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p, idx) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/products/products/${p.id}`} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
                        <path d="M3.27 6.96L12 12l8.73-5.04" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-500">View detail</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">{p.sku}</td>
                <td className="px-4 py-3">{p.category ?? "-"}</td>
                <td className="px-4 py-3">{currency(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setOpenEdit(p.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        // Placeholder: wire to delete later
                        window.alert("Delete action coming soon");
                      }}
                    >
                      Delete
                    </button>
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openAdd ? (
        <ProductDrawer mode="add" onClose={() => setOpenAdd(false)} />
      ) : null}
      {openEdit ? (
        <ProductDrawer mode="edit" productId={openEdit} onClose={() => setOpenEdit(null)} />
      ) : null}
    </div>
  );
}

type DrawerProps = {
  mode: "add" | "edit";
  productId?: string | null;
  onClose: () => void;
};

function ProductDrawer({ mode, productId, onClose }: DrawerProps) {
  const editing = React.useMemo(() => products.find((p) => p.id === productId) ?? null, [productId]);

  const [name, setName] = React.useState(editing?.name ?? "");
  const [sku, setSku] = React.useState(editing?.sku ?? "");
  const [category, setCategory] = React.useState(editing?.category ?? "");
  const [price, setPrice] = React.useState<string>(editing ? String(editing.price) : "");
  const [stock, setStock] = React.useState<string>(editing ? String(editing.stock) : "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [imageFile, setImageFile] = React.useState<File | null>(null);

  function onSave() {
    onClose();
  }

  return (
    <SideDrawer
      open
      onClose={onClose}
      title={mode === "add" ? "Add Product" : "Edit Product"}
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      )}
    >
      <div className="grid gap-4">
        <div className="grid place-items-center">
          <ImageUploader value={imageFile} onChange={setImageFile} circle size={120} />
        </div>
        <TextField label="Name" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="SKU" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <TextField label="Category" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Price" type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          <TextField label="Stock" type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        <TextArea label="Description" rows={4} placeholder="Describe the product..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
    </SideDrawer>
  );
}
