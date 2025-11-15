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
import { Category, Currency, MultimodalEmbeddingResponse } from "@/types"; 
import { toast } from "react-toastify";
import LoadingScreen from "@/components/loading-screen";
import logger from "@/lib/logger";
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
  const [size, setSize] = React.useState("");
  const [price, setPrice] = React.useState<number>(0);
  const [stock, setStock] = React.useState<number>(0);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);

  // Store original values to detect changes for embedding regeneration
  const [originalProduct, setOriginalProduct] = React.useState<{
    name: string;
    sku: string;
    size: string;
    price: number;
    categoryId: string | null;
    description: string;
    imageUrl: string | null;
  } | null>(null);

  React.useEffect(() => {
    if (!id) return setLoading(false);
    async function load() {
      setLoading(true);
      const [{ data: p }, { data: cats }] = await Promise.all([
        supabase
          .from("products")
          .select("id,name,sku,size,price,stock,category_id,description,image_url")
          .eq("id", id)
          .single(),
        supabase.from("product_categories").select("id,name").order("name", { ascending: true }),
      ]);
      if (p) {
        const productData = {
          name: (p as any).name ?? "",
          sku: (p as any).sku ?? "",
          size: (p as any).size ?? "",
          price: Number((p as any).price ?? 0),
          categoryId: (p as any).category_id ?? null,
          description: (p as any).description ?? "",
          imageUrl: (p as any).image_url ?? null,
        };
        setName(productData.name);
        setSku(productData.sku);
        setSize(productData.size);
        setPrice(productData.price);
        setStock(Number((p as any).stock ?? 0));
        setCategoryId(productData.categoryId);
        setDescription(productData.description);
        setImageUrl(productData.imageUrl);
        // Store original values for change detection
        setOriginalProduct(productData);
      }
      setCategories((cats as any) ?? []);
      setLoading(false);
    }
    load();
  }, [id]);

  function composeEmbeddingText(): string {
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";
    const parts = [
      name,
      sku ? `SKU: ${sku}` : null,
      size ? `Size: ${size}` : null,
      categoryName ? `Category: ${categoryName}` : null,
      `Price: ${Currency(price)}`,
      description.trim() || null,
    ].filter(Boolean) as string[];
    return parts.join("\n");
  }

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
          size: size.trim(),
          price,
          stock,
          category_id: categoryId,
          description: description.trim() || null,
          image_url: finalImageUrl,
        })
        .eq("id", id);
      if (error) throw error;

      // Regenerate embedding if relevant fields changed
      if (originalProduct) {
        const changedText =
          originalProduct.name !== name.trim() ||
          originalProduct.sku !== sku.trim() ||
          originalProduct.size !== size.trim() ||
          originalProduct.categoryId !== categoryId ||
          originalProduct.price !== price ||
          (originalProduct.description ?? "") !== (description.trim() || "");
        const changedImage = finalImageUrl !== originalProduct.imageUrl;
        
        if (changedText || changedImage) {
          // Attempt to regenerate embeddings in the background
          // Strategy: Try text-only first (more reliable), skip image embeddings for now
          try {
            logger.info("Regenerating embeddings for product: %s", id);
            logger.info("Using text-only embedding (image embeddings disabled due to Vertex AI limitations)");
            
            const textOnlyRes = await fetch("/api/embeddings/multimodal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: composeEmbeddingText() }),
            });
            
            const data = (await textOnlyRes.json()) as MultimodalEmbeddingResponse;
            logger.info("Embedding API response:", { status: textOnlyRes.status, data });
            
            if (textOnlyRes.ok && (data.embedding || data.textEmbedding || data.imageEmbedding)) {
              const combined = data.embedding ?? data.textEmbedding ?? data.imageEmbedding;
              await supabase.from("products").update({ embedding: combined }).eq("id", id);
              toast.success("Product and embeddings updated successfully");
            } else if (!textOnlyRes.ok) {
              const errorMsg = data.error || "Unknown error";
              const errorDetails = data.details || "";
              logger.error("Embedding generation failed:", errorMsg, errorDetails);
              toast.warning(`Product updated, but embedding generation failed: ${errorMsg}`);
            } else {
              logger.warn("No embeddings returned from API");
              toast.success("Product updated (no embeddings generated)");
            }
          } catch (embErr) {
            logger.error("Embedding regeneration error:", embErr);
            const errorMessage = embErr instanceof Error ? embErr.message : "Unknown error";
            toast.warning(`Product updated, but embedding generation failed: ${errorMessage}`);
          }
        } else {
          toast.success("Product updated successfully");
        }
      } else {
        toast.success("Product updated successfully");
      }

      // Update stored values
      setImageUrl(finalImageUrl ?? null);
      setImageFile(null);
      setOriginalProduct({
        name: name.trim(),
        sku: sku.trim(),
        size: size.trim(),
        price,
        categoryId,
        description: description.trim() || "",
        imageUrl: finalImageUrl,
      });
    } catch (err) {
      toast.error((err as Error).message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        logger.error("Delete failed");
        toast.error(error.message as string);
        return;
      } else {
        toast.success("Product deleted successfully");  
        router.push("/dashboard/products/products");
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }
  return (
    <>
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <Link href="/dashboard/products/products" className="text-gray-700 hover:text-brand transition-colors">Products</Link>
          <span>›</span>
          <span className="font-bold text-brand">{name || "(Unnamed)"}</span>
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
            <TextField label="Size" placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} />
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

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 bg-brand-subtle p-4 text-sm" style={{ borderImage: "linear-gradient(135deg, var(--brand-start), var(--brand-end)) 1" }}>
            <div className="font-medium text-gray-700">Preview</div>
            <div className="text-right font-bold text-brand">{Currency(price)}</div>
            <div className="font-medium text-gray-700">In stock</div>
            <div className="text-right font-bold text-brand">{stock}</div>
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
