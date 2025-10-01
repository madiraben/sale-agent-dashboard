"use client";

import React from "react";
import { useParams } from "next/navigation";
import { products, currency } from "@/data/mock";
import Link from "next/link";
import Button from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const router = useRouter();
  if (!product) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-4 text-sm text-gray-600">
          <Link href="/dashboard/products/products" className="text-[#1E8BF7] hover:underline">← Back to products</Link>
        </div>
        <div className="text-gray-700">Product not found.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5H9v5a2 2 0 0 1-2 2H3z" />
          </svg>
          <Link href="/dashboard/products/products" className="text-gray-700 hover:underline">Products</Link>
          <span>›</span>
          <span className="font-medium text-gray-900">{product.name}</span>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/products/products")}>
            Back
          </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="grid h-48 w-48 place-items-center rounded-lg bg-gray-100 text-gray-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" />
              <path d="M3.27 6.96L12 12l8.73-5.04" />
            </svg>
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-500">Product</div>
              <div className="text-lg font-medium text-gray-900">{product.name}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">SKU</div>
                <div className="text-gray-900">{product.sku}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Category</div>
                <div className="text-gray-900">{product.category ?? "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Price</div>
                <div className="text-gray-900">{currency(product.price)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Stock</div>
                <div className="text-gray-900">{product.stock}</div>
              </div>
            </div>
            {product.description ? (
              <div>
                <div className="text-sm text-gray-500">Description</div>
                <div className="text-gray-900">{product.description}</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
