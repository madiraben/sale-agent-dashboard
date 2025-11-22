"use client";

import React from "react";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/text-field";
import Modal from "@/components/ui/modal";
import SearchInput from "@/components/ui/search-input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import TextArea from "@/components/ui/text-area";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { toast } from "react-toastify";
import { Category } from "@/types";

export default function ProductCategoriesPage() {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [q, setQ] = React.useState("");
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [openAdd, setOpenAdd] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id,name,updated_at")
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message || "Failed to load categories");
    }
    setCategories((data as any) ?? []);
  }

  React.useEffect(() => {
    loadCategories();
  }, []);

  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(s));
  }, [q, categories]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <span className="text-gray-700">Products</span>
          <span>›</span>
          <span className="font-bold text-gray-900">Categories</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-icon-round">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </button>
          <button className="btn-icon-round">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          <Button aria-label="Add Category" className="gap-2" onClick={() => setOpenAdd(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border-2 border-black">
          <thead className="table-header-gradient text-white font-semibold">
            <tr>
              <th className="px-3 py-2 w-14">No.</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id} className="hover:bg-gray-100 border-t border-gray-300">
                <td className="px-3 py-2 text-black">{idx + 1}.</td>
                <td className="px-3 py-2 text-black">
                  <div className="inline-flex items-center gap-2">
                    <span className="font-semibold text-black">{c.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-black">{c.updated_at ? new Date(c.updated_at as string).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button className="btn-brand-outline rounded-lg h-8" onClick={() => setOpenEdit(c.id)}>
                      Edit
                    </button>
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50" onClick={() => setDeleteId(c.id)}>
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

      {openAdd ? <AddCategoryDrawer onClose={() => { setOpenAdd(false); loadCategories(); }} /> : null}
      {openEdit ? <EditCategoryDrawer id={openEdit} onClose={() => { setOpenEdit(null); loadCategories(); }} /> : null}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Category"
        description="This action cannot be undone. Are you sure you want to delete this category?"
        confirmText="Delete"
        destructive
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          setDeleting(true);
          const { error } = await supabase.from("product_categories").delete().eq("id", deleteId);
          setDeleting(false);
          setDeleteId(null);
          if (error) toast.error(error.message || "Delete failed");
          else toast.success("Category deleted");
          loadCategories();
        }}
      />
    </div>
  );
}

function AddCategoryDrawer({ onClose }: { onClose: () => void }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSave() {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("product_categories").insert({ name: name.trim(), description: description.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to add category");
    } else {
      toast.success("Category added");
      onClose();
    }
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="Add Category"
      widthClassName="max-w-md"
    >
      <div className="space-y-4">
        <TextField
          label="Category Name"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextArea
          label="Description"
          rows={4}
          placeholder="Describe this category (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </Modal>
  );
}

function EditCategoryDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    supabase
      .from("product_categories")
      .select("id,name,description")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setName((data as any)?.name ?? "");
        setDescription((data as any)?.description ?? "");
      });
  }, [id]);

  async function onSave() {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("product_categories")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Failed to update category");
    } else {
      toast.success("Category updated");
      onClose();
    }
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="Edit Category"
      widthClassName="max-w-md"
    >
      <div className="space-y-4">
        <TextField
          label="Category Name"
          placeholder="Enter category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextArea
          label="Description"
          rows={4}
          placeholder="Describe this category (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </Modal>
  );
}

