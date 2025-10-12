"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/text-field";
import TextArea from "@/components/ui/text-area";
import ImageUploader from "@/components/ui/image-uploader";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { currency } from "@/data/mock";

type Category = { id: string; name: string };

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [price, setPrice] = React.useState<number>(0);
  const [stock, setStock] = React.useState<number>(0);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);

  React.useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [{ data: p }, { data: cats }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,sku,price,stock,category_id,description,image_url")
          .eq("id", id)
          .single(),
        supabase.from("product_categories").select("id,name").order("name", { ascending: true }),
      ]);
      if (p) {
        setName((p as any).name ?? "");
        setSku((p as any).sku ?? "");
        setPrice(Number((p as any).price ?? 0));
        setStock(Number((p as any).stock ?? 0));
        setCategoryId((p as any).category_id ?? null);
        setDescription((p as any).description ?? "");
        setImageUrl((p as any).image_url ?? null);
      }
      setCategories((cats as any) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const path = `${id}/${Date.now()}_${imageFile.name}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
        finalImageUrl = pub.publicUrl;
      }
      const { error } = await supabase
        .from("products")
        .update({
          name: name.trim(),
          sku: sku.trim(),
          price,
          stock,
          category_id: categoryId,
          description: description.trim() || null,
          image_url: finalImageUrl,
        })
        .eq("id", id);
      if (error) throw error;
      setImageUrl(finalImageUrl ?? null);
      setImageFile(null);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      router.push("/dashboard/products/products");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="text-gray-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <Link href="/dashboard/products/products" className="text-gray-700 hover:underline">Products</Link>
          <span>›</span>
          <span className="font-medium text-gray-900">{name || "(Unnamed)"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/products/products")}>Back</Button>
          <Button variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setConfirmDelete(true)} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ImageUploader
            value={imageFile}
            onChange={setImageFile}
            circle={false}
            widthPx={240}
            heightPx={240}
            initialUrl={imageUrl ?? undefined}
          />
          <div className="mt-3 text-xs text-gray-500">Public bucket: product-images</div>
        </div>
        <div className="md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextField label="Product Name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <TextField label="SKU" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <TextField label="Price" type="number" value={String(price)} onChange={(e) => setPrice(Number(e.target.value))} />
            <TextField label="Stock" type="number" value={String(stock)} onChange={(e) => setStock(Number(e.target.value))} />
            <div>
              <div className="mb-1 text-sm text-gray-700">Category</div>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <TextArea label="Description" rows={5} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
            <div className="text-gray-600">Preview</div>
            <div className="text-right font-semibold text-gray-900">{currency(price)}</div>
            <div className="text-gray-600">In stock</div>
            <div className="text-right text-gray-900">{stock}</div>
          </div>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={confirmDelete}
      title="Delete Product"
      description="This action cannot be undone. Are you sure you want to delete this product?"
      confirmText="Delete"
      destructive
      busy={deleting}
      onCancel={() => setConfirmDelete(false)}
      onConfirm={onDelete}
    />
    </>
  );
}
