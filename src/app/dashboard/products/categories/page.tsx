"use client";

import React from "react";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/text-field";
import SideDrawer from "@/components/ui/side-drawer";
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
          <span className="font-medium text-gray-900">Categories</span>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput className="hidden md:block" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 6h18M6 12h12M10 18h4" />
            </svg>
          </button>
          <button className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50">
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
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-y border-gray-200 text-gray-600">
              <th className="px-4 py-3 w-14">No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((c, idx) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                <td className="px-4 py-3 text-gray-800">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-gray-700">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{c.updated_at ? new Date(c.updated_at as string).toLocaleDateString() : "-"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setOpenEdit(c.id)}>
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

  async function onSave() {
    if (!name.trim()) return onClose();
    const { error } = await supabase.from("product_categories").insert({ name: name.trim(), description: description.trim() || null });
    if (error) {
      toast.error(error.message || "Failed to add category");
    } else {
      toast.success("Category added");
    }
    onClose();
  }

  return (
    <SideDrawer
      open
      onClose={onClose}
      title="Add Category"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      )}
    >
      <div className="mt-2">
        <TextField
          placeholder="Category Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <TextArea
          label="Description"
          rows={4}
          placeholder="Describe this category (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </SideDrawer>
  );
}

function EditCategoryDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

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
    if (!name.trim()) return onClose();
    const { error } = await supabase
      .from("product_categories")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", id);
    if (error) toast.error(error.message || "Failed to update category");
    else toast.success("Category updated");
    onClose();
  }

  return (
    <SideDrawer
      open
      onClose={onClose}
      title="Edit Category"
      footer={(
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      )}
    >
      <div className="mt-2">
        <TextField
          placeholder="Category Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <TextArea
          label="Description"
          rows={4}
          placeholder="Describe this category (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </SideDrawer>
  );
}

