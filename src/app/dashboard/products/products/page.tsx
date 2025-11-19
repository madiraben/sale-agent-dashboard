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
import logger from "@/lib/logger";
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
      .select("id,name,sku,size,price,stock,category_id,product_categories!category_id(name),image_url,description")
      .order("name", { ascending: true });
    
    if (error) {
      logger.error("Failed to load products: %o", error);
      toast.error(error.message as string || "Failed to load products");
    } else if (data) {
      logger.info("Loaded %d products", data.length);
      setRows((data as any));
    }
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
          <span className="font-bold text-gray-900">List</span>
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
            <tr className="border-y-2 text-gray-700 font-semibold" style={{ borderImage: "linear-gradient(90deg, var(--brand-start), var(--brand-end)) 1" }}>
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
              <tr key={p.id} className="hover:bg-brand-subtle transition-colors">
                <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-9 w-9 rounded-lg object-cover border-2" style={{ borderImage: "linear-gradient(135deg, var(--brand-start), var(--brand-end)) 1" }} />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
                          <path d="M3.27 6.96L12 12l8.73-5.04" />
                        </svg>
                      </span>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{p.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{p.sku}</td>
                <td className="px-4 py-3 text-gray-700">{(p as any).size ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700">{(p as any).product_categories?.name ?? "-"}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{Currency(p.price)}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{p.stock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-lg border-2 px-3 text-sm font-medium hover:bg-brand-subtle transition-all"
                      style={{ borderImage: "linear-gradient(135deg, var(--brand-start), var(--brand-end)) 1" }}
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
          
          const { data, error, count } = await supabase
            .from("products")
            .delete()
            .eq("id", deleteId)
            .select();
          
          logger.info("Delete result - data: %o, error: %o, count: %o", data, error, count);
          
          setDeleting(false);
          setDeleteId(null);
          
          if (error) {
            logger.error("Delete failed with error: %o", error);
            toast.error(error.message as string || "Failed to delete product");
          } else if (!data || data.length === 0) {
            logger.error("DELETE returned 0 rows - RLS policy blocked it!");
            toast.error("Failed to delete: Permission denied (check tenant status)");
          } else {
            logger.info("Product deleted successfully");
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
  const [tenantId, setTenantId] = React.useState<string | null>(null);
  
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

  // Load current user's tenant_id
  React.useEffect(() => {
    supabase
      .from("user_tenants")
      .select("tenant_id")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setTenantId((data as any).tenant_id);
      });
  }, []);

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
    if (!imageFile) {
      logger.info("No image file to upload, returning existing URL");
      return editing?.image_url as any;
    }
    if (!tenantId) {
      logger.error("Tenant ID not available for image upload");
      toast.error("Unable to upload image: tenant not found");
      return editing?.image_url as any;
    }
    
    // Organize images by tenant: {tenant_id}/{product_id}/{timestamp}_{filename}
    const filePath = `${tenantId}/${productId}/${Date.now()}_${imageFile.name}`;
    logger.info("Uploading image to path: %s", filePath);
    
    const { error: upErr, data: uploadData } = await supabase.storage.from("product-images").upload(filePath, imageFile, {
      cacheControl: "3600",
      upsert: false,
    });
    
    if (upErr) {
      logger.error("Image upload failed: %s", upErr);
      toast.error(`Image upload failed: ${upErr.message}`);
      return editing?.image_url as any;
    }
    
    logger.info("Image uploaded successfully, data: %o", uploadData);
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
    logger.info("Public URL data: %o", urlData);
    
    if (!urlData?.publicUrl) {
      logger.error("Failed to get public URL for uploaded image");
      toast.error("Failed to get public URL for uploaded image");
      return editing?.image_url as any;
    }
    
    logger.info("Returning public URL: %s", urlData.publicUrl);
    return urlData.publicUrl;
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
    
    // Ensure tenantId is loaded
    if (!tenantId) {
      logger.error("Cannot save product: tenantId not loaded");
      toast.error("Please wait a moment and try again");
      return;
    }
    
    setSaving(true);
    if (mode === "add") {
      // BETTER APPROACH: Create product with temp ID first to upload image, then insert with image_url
      const tempProductId = crypto.randomUUID();
      
      logger.info("=== ADD PRODUCT DEBUG ===");
      logger.info("imageFile: %o", imageFile);
      logger.info("tenantId: %s", tenantId);
      logger.info("tempProductId: %s", tempProductId);
      
      // 1) Upload image first if provided
      let imageUrl: string | undefined;
      if (imageFile) {
        if (!tenantId) {
          logger.error("tenantId is null, cannot upload image!");
          toast.error("Tenant not loaded, please refresh and try again");
          setSaving(false);
          return;
        }
        
        const filePath = `${tenantId}/${tempProductId}/${Date.now()}_${imageFile.name}`;
        logger.info("Uploading image to path: %s", filePath);
        
        const { error: upErr, data: uploadData } = await supabase.storage
          .from("product-images")
          .upload(filePath, imageFile, { cacheControl: "3600", upsert: false });
        
        if (upErr) {
          logger.error("Image upload failed: %s", upErr);
          toast.error(`Image upload failed: ${upErr.message}`);
        } else {
          logger.info("Image uploaded successfully, uploadData: %o", uploadData);
          const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
          imageUrl = urlData?.publicUrl;
          logger.info("Image URL retrieved: %s", imageUrl);
        }
      } else {
        logger.info("No image file selected");
      }
      
      // 2) Generate embeddings BEFORE insert
      let embedding: number[] | undefined;
      let imageEmbedding: number[] | undefined;
      let embeddingMetadata: any = undefined;
      let imageBase64: string | undefined;
      
      try {
        logger.info("=== EMBEDDING GENERATION START ===");
        const embeddingText = composeEmbeddingText();
        logger.info("Embedding text: %s", embeddingText);
        
        // Process image for Vertex AI if we have one
        if (imageFile) {
          logger.info("Processing image for embedding...");
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = (e) => {
              img.onload = () => {
                // Resize to max 512x512 (Vertex AI requirement)
                const MAX_SIZE = 512;
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > MAX_SIZE) {
                  height = (height * MAX_SIZE) / width;
                  width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                  width = (width * MAX_SIZE) / height;
                  height = MAX_SIZE;
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  reject(new Error("Failed to get canvas context"));
                  return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with quality 0.8
                const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                logger.info("Image processed: %dx%d, base64 length: %d", width, height, base64.length);
                resolve(base64);
              };
              img.onerror = () => reject(new Error("Failed to load image"));
              img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("Failed to read image file"));
            reader.readAsDataURL(imageFile);
          });
        }
        
        logger.info("Calling /api/embeddings/multimodal with %s...", imageBase64 ? "text + image" : "text only");
        const embRes = await fetch("/api/embeddings/multimodal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: embeddingText,
            ...(imageBase64 ? { imageBase64 } : {}),
          }),
        });
        
        logger.info("Embedding API response status: %d", embRes.status);
        const embData = (await embRes.json()) as MultimodalEmbeddingResponse;
        logger.info("Embedding API response data: %o", embData);
        
        if (embRes.ok && (embData.embedding || embData.textEmbedding || embData.imageEmbedding)) {
          // Use textEmbedding as primary (more accurate for text search)
          embedding = embData.textEmbedding ?? embData.embedding ?? embData.imageEmbedding;
          // Store image embedding separately if available
          imageEmbedding = embData.imageEmbedding;
          // Store full metadata for debugging
          embeddingMetadata = {
            hasTextEmbedding: !!embData.textEmbedding,
            hasImageEmbedding: !!embData.imageEmbedding,
            hasCombinedEmbedding: !!embData.embedding,
            usedRegion: embData.usedRegion,
            generatedAt: new Date().toISOString(),
          };
          logger.info("Embeddings generated - text: %d, image: %d", 
            embData.textEmbedding?.length || 0, 
            embData.imageEmbedding?.length || 0
          );
        } else {
          logger.error("No embedding returned from API. Response: %o", embData);
        }
      } catch (embErr) {
        logger.error("Failed to generate embeddings: %o", embErr);
      }
      
      // 3) Insert product with ALL fields including embeddings
      const { data: inserted, error } = await supabase
        .from("products")
        .insert({ 
          id: tempProductId,
          name, 
          sku, 
          size, 
          category_id: categoryId || null, 
          price: Number(price || 0), 
          stock: Number(stock || 0), 
          description,
          image_url: imageUrl || null,
          embedding: embedding || null,
          image_embedding: imageEmbedding || null,
          embedding_metadata: embeddingMetadata || null
        })
        .select("id, tenant_id, image_url, embedding, image_embedding, embedding_metadata")
        .single();
      
      logger.info("Product insert result: %o", inserted);
      if (error) {
        logger.error("Failed to insert product: %s", error);
        toast.error(`Failed to create product: ${error.message}`);
        setSaving(false);
        return;
      }
      if (inserted) {
        const hasTextEmb = !!inserted.embedding;
        const hasImageEmb = !!inserted.image_embedding;
        const hasMetadata = !!inserted.embedding_metadata;
        
        logger.info("Product created - Text embedding: %s, Image embedding: %s, Metadata: %s", 
          hasTextEmb ? "✅" : "❌", 
          hasImageEmb ? "✅" : "❌", 
          hasMetadata ? "✅" : "❌"
        );
        
        if (hasTextEmb && hasImageEmb) {
          logger.info("✅ Product created WITH both text and image embeddings!");
          toast.success("Product created with full embeddings");
        } else if (hasTextEmb) {
          logger.info("⚠️ Product created with text embedding only");
          toast.success("Product created with text embeddings");
        } else {
          logger.warn("⚠️ Product created but embeddings are null");
          toast.warning("Product created but embeddings generation failed");
        }

      }
      setSaving(false);
      onClose();
      return;
    }
    if (mode === "edit" && editing) {
      const publicUrl = await uploadImageIfNeeded(editing.id);
      const { error: updateError } = await supabase
        .from("products")
        .update({ name, sku, size, category_id: categoryId || null, price: Number(price || 0), stock: Number(stock || 0), description, image_url: publicUrl ?? editing.image_url })
        .eq("id", editing.id);
      
      if (updateError) {
        logger.error("Failed to update product: %s", updateError);
        toast.error(`Failed to update product: ${updateError.message}`);
        setSaving(false);
        return;
      }

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
          // Use text-only embeddings to avoid image validation issues
          logger.info("Regenerating text-only embeddings for product: %s", editing.id);
          const res = await fetch("/api/embeddings/multimodal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: composeEmbeddingText(),
            }),
          });
          const data = (await res.json()) as MultimodalEmbeddingResponse;
          if (res.ok && (data.embedding || data.textEmbedding || data.imageEmbedding)) {
            const combined = data.embedding ?? data.textEmbedding ?? data.imageEmbedding;
            await supabase.from("products").update({ embedding: combined }).eq("id", editing.id);
            logger.info("Embeddings updated successfully for product: %s", editing.id);
          } else {
            logger.warn("Failed to update embeddings: %s", data);
            toast.warning("Failed to update embeddings");
          }
        } catch (embErr) {
          logger.error("Embedding regeneration failed: %s", embErr);
          toast.error("Embedding regeneration failed");
        }
      }
      toast.success("Product updated successfully");
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
        <TextField label="Name" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="SKU" placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
          <TextField label="Size" placeholder="Size" value={size} onChange={(e) => setSize(e.target.value)} required />
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
          <TextField label="Price" type="number" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <TextField label="Stock" type="number" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
        </div>
        <TextArea label="Description" rows={4} placeholder="Describe the product..." value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
    </SideDrawer>
  );
}
