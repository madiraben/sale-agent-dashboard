"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { Product, MultimodalEmbeddingResponse } from "@/types";
import { Currency } from "@/types";
import SearchInput from "@/components/ui/search-input";
import Button from "@/components/ui/button";
import SideDrawer from "@/components/ui/side-drawer";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import ImageUploader from "@/components/ui/image-uploader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
export default function Product() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const debouncedSetQ = React.useMemo(() => {
    let t: any;
    return (v: string) => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setQ(v), 200);
    };
  }, []);
  const [openAdd, setOpenAdd] = React.useState(false);
  // Removed unused inline edit drawer state; edits navigate to detail page
  const [rows, setRows] = React.useState<Array<Product & { image_url?: string; category_id?: string }>>([]);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id,name,sku,size,price,stock,category_id,product_categories(name),image_url,description")
      .order("name", { ascending: true });
    if (!error && data) setRows((data as any));
    if (error) toast.error(error.message as string || "Failed to load products");
  }

  React.useEffect(() => {
    loadProducts();
  }, []);

  const filteredRows = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((p) =>
      [p.name, p.sku, (p as any).size, (p as any).product_categories?.name].some((v) => (v ?? "").toLowerCase().includes(s))
    );
  }, [q, rows]);

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
          <SearchInput className="hidden md:block" value={q} onChange={(e) => debouncedSetQ(e.target.value)} />
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
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRows.map((p, idx) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
                          <path d="M3.27 6.96L12 12l8.73-5.04" />
                        </svg>
                      </span>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{p.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.sku}</td>
                <td className="px-4 py-3">{(p as any).size ?? "-"}</td>
                <td className="px-4 py-3">{(p as any).product_categories?.name ?? "-"}</td>
                <td className="px-4 py-3">{Currency(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => router.push(`/dashboard/products/products/${p.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(p.id)}
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
        <ProductDrawer mode="add" onClose={() => { setOpenAdd(false); loadProducts(); }} />
      ) : null}
      {/* Inline edit drawer removed; edit navigates to detail page */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Product"
        description="This action cannot be undone. Are you sure you want to delete this product?"
        confirmText="Delete"
        destructive
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) { setDeleting(false); setDeleteId(null); return; }
          setDeleting(true);
          const { error } = await supabase.from("products").delete().eq("id", deleteId);
          setDeleting(false);
          setDeleteId(null);
          if (error) toast.error(error.message as string || "Failed to delete product");
          else {
            toast.success("Product deleted successfully");
            loadProducts();
          }
        }}
      />
    </div>
  );
}

type DrawerProps = {
  mode: "add" | "edit";
  productId?: string | null;
  onClose: () => void;
};

function ProductDrawer({ mode, productId, onClose }: DrawerProps) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = React.useState<null | (Product & { image_url?: string })>(null);
  React.useEffect(() => {
    if (mode === "edit" && productId) {
      supabase
        .from("products")
        .select("id,name,sku,size,price,stock,category_id,image_url,description")
        .eq("id", productId)
        .single()
        .then(({ data }) => setEditing(data as any));
    }
  }, [mode, productId]);

  const [name, setName] = React.useState(editing?.name ?? "");
  const [sku, setSku] = React.useState(editing?.sku ?? "");
  const [size, setSize] = React.useState(editing?.size ?? "");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [categories, setCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [price, setPrice] = React.useState<string>(editing ? String(editing.price) : "");
  const [stock, setStock] = React.useState<string>(editing ? String(editing.stock) : "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageWidth, setImageWidth] = React.useState<string>("");
  const [imageHeight, setImageHeight] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!editing) return;
    setName(editing.name ?? "");
    setSku(editing.sku ?? "");
    setSize((editing as any).size ?? "");
    setCategoryId((editing as any).category_id ?? "");
    setPrice(String(editing.price ?? ""));
    setStock(String(editing.stock ?? ""));
    setDescription(editing.description ?? "");
  }, [editing]);

  React.useEffect(() => {
    supabase.from("product_categories").select("id,name").order("name", { ascending: true }).then(({ data }) => setCategories(data ?? []));
  }, []);

  async function uploadImageIfNeeded(productId: string): Promise<string | undefined> {
    if (!imageFile) return editing?.image_url as any;
    const filePath = `${productId}-${Date.now()}-${imageFile.name}`;
    const { error: upErr } = await supabase.storage.from("product-images").upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) return editing?.image_url as any;
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return urlData?.publicUrl;
  }

  function composeEmbeddingText(): string {
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? categoryId ?? "";
    const priceNumber = Number(price || 0);
    const parts = [
      name,
      sku ? `SKU: ${sku}` : null,
      size ? `Size: ${size}` : null,
      categoryName ? `Category: ${categoryName}` : null,
      `Price: ${Currency(priceNumber)}`,
      (description ?? "").trim() ? (description ?? "").trim() : null,
    ].filter(Boolean) as string[];
    return parts.join("\n");
  }

  async function onSave() {
    if (!name || !sku) return onClose();
    setSaving(true);
    if (mode === "add") {
      // 1) Insert base fields
      const { data: inserted, error } = await supabase
        .from("products")
        .insert({ name, sku, size, category_id: categoryId || null, price: Number(price || 0), stock: Number(stock || 0), description })
        .select("id")
        .single();
      if (!error && inserted) {
        const publicUrl = await uploadImageIfNeeded(inserted.id);
        if (publicUrl) {
          await supabase.from("products").update({ image_url: publicUrl }).eq("id", inserted.id);
        }

        // 2) Build embedding payload and call API
        try {
          let imageBase64: string | undefined;
          if (imageFile) {
            imageBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.split(",")[1] || "";
                resolve(base64);
              };
              reader.onerror = () => reject(new Error("Failed to convert image to base64"));
              reader.readAsDataURL(imageFile);
            });
          }

          const res = await fetch("/api/embeddings/multimodal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: composeEmbeddingText(),
              ...(imageBase64 ? { imageBase64 } : {}),
            }),
          });
          const data = (await res.json()) as MultimodalEmbeddingResponse;
          if (res.ok && (data.embedding || data.textEmbedding || data.imageEmbedding)) {
            const combined = data.embedding ?? data.textEmbedding ?? data.imageEmbedding;
            await supabase.from("products").update({ embedding: combined }).eq("id", inserted.id);
          }
        } catch {}
      }
      setSaving(false);
      onClose();
      return;
    }
    if (mode === "edit" && editing) {
      const publicUrl = await uploadImageIfNeeded(editing.id);
      await supabase
        .from("products")
        .update({ name, sku, size, category_id: categoryId || null, price: Number(price || 0), stock: Number(stock || 0), description, image_url: publicUrl ?? editing.image_url })
        .eq("id", editing.id);

      // regenerate embedding if text (name, sku, size, category, price, description) or image changed
      const changedText =
        (editing.description ?? "") !== (description ?? "") ||
        (editing.name ?? "") !== (name ?? "") ||
        (editing.sku ?? "") !== (sku ?? "") ||
        (editing as any).size !== (size ?? "") ||
        ((editing as any).category_id ?? "") !== (categoryId ?? "") ||
        Number((editing as any).price ?? 0) !== Number(price || 0);
      const changedImage = (publicUrl ?? editing.image_url) !== editing.image_url;
      if (changedText || changedImage) {
        try {
          const res = await fetch("/api/embeddings/multimodal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: composeEmbeddingText(),
              ...((publicUrl ?? editing.image_url) ? { imageUrl: (publicUrl ?? editing.image_url)! } : {}),
            }),
          });
          const data = (await res.json()) as MultimodalEmbeddingResponse;
          if (res.ok && (data.embedding || data.textEmbedding || data.imageEmbedding)) {
            const combined = data.embedding ?? data.textEmbedding ?? data.imageEmbedding;
            await supabase.from("products").update({ embedding: combined }).eq("id", editing.id);
          }
        } catch {}
      }
      setSaving(false);
      onClose();
      return;
    }
    setSaving(false);
    onClose();
  }

  return (
    <SideDrawer
      open
      onClose={onClose}
      title={mode === "add" ? "Add Product" : "Edit Product"}
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      )}
    >
      <div className="grid gap-4">
        <div className="grid place-items-center gap-3">
          <ImageUploader value={imageFile} onChange={setImageFile} circle={false} widthPx={Number(imageWidth) || 160} heightPx={Number(imageHeight) || 160} initialUrl={editing?.image_url} />
          <div className="grid grid-cols-2 gap-3 w-full">
            <TextField label="Image width (px)" type="number" placeholder="e.g. 600" value={imageWidth} onChange={(e) => setImageWidth(e.target.value)} />
            <TextField label="Image height (px)" type="number" placeholder="e.g. 600" value={imageHeight} onChange={(e) => setImageHeight(e.target.value)} />
          </div>
        </div>
        <TextField label="Name" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="SKU" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
          <TextField label="Size" placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} />
          <div>
            <div className="mb-1 text-sm text-gray-700">Category</div>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
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
