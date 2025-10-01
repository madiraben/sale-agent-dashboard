"use client";

import React from "react";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/text-field";
import SideDrawer from "@/components/ui/side-drawer";
import ImageUploader from "@/components/ui/image-uploader";
import SearchInput from "@/components/ui/search-input";

type Category = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  productCount: number;
  updatedAt: string;
};

const mockCategories: Category[] = [
  { id: "1", name: "Alcohol", productCount: 5, updatedAt: "29-Sep-2025" },
  { id: "2", name: "Beverage", productCount: 12, updatedAt: "29-Sep-2025" },
  { id: "3", name: "Food-Meat", productCount: 1, updatedAt: "29-Sep-2025" },
];

export default function ProductCategoriesPage() {
  const [categories] = React.useState<Category[]>(mockCategories);
  const [openAdd, setOpenAdd] = React.useState(false);

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
          <SearchInput className="hidden md:block" />
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
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((c, idx) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{idx + 1}.</td>
                <td className="px-4 py-3 text-gray-800">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-gray-700">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{c.productCount}</td>
                <td className="px-4 py-3">{c.updatedAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50">
                      Edit
                    </button>
                    <button className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">
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

      {openAdd ? <AddCategoryDrawer onClose={() => setOpenAdd(false)} /> : null}
    </div>
  );
}

function AddCategoryDrawer({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);

  function onSave() {
    // For now just close. Wire to API later.
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
      <div className="grid place-items-center">
        <ImageUploader value={file} onChange={setFile} circle size={160} />
      </div>
      <div className="mt-6">
        <TextField
          placeholder="Category Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </SideDrawer>
  );
}

