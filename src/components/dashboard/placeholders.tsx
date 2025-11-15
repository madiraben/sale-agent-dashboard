import React from "react";

export function GaugePlaceholder() {
  return (
    <div className="grid place-items-center py-6">
      <div className="relative h-48 w-72 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-b-[90px] bg-brand" />
        <div className="absolute inset-6 bottom-0 top-12 rounded-b-[70px] bg-white" />
      </div>
      <div className="mt-2 text-center text-sm text-gray-700">
        <div className="font-medium">Total</div>
        <div className="text-base font-bold text-brand">18</div>
      </div>
    </div>
  );
}

export function BarPlaceholder() {
  return (
    <div className="h-64 w-full rounded-lg border border-dashed border-gray-200 p-4">
      <div className="flex h-full w-full items-end gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="mx-auto w-6 rounded bg-brand" style={{ height: `${40 + (i % 3) * 20}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}


