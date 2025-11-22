"use client";

import React from "react";

type ImageUploaderProps = {
  value?: File | null;
  onChange?: (file: File | null) => void;
  circle?: boolean;
  size?: number; // diameter in px if circle, width if square (fallback)
  widthPx?: number; // width for rectangular (when circle is false)
  heightPx?: number; // height for rectangular (when circle is false)
  placeholder?: React.ReactNode;
  initialUrl?: string; // when provided, show this image when no file is selected
};

export default function ImageUploader({ value, onChange, circle = true, size = 160, widthPx, heightPx, placeholder, initialUrl }: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    onChange?.(f);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check if it's an image
      if (file.type.startsWith('image/')) {
        onChange?.(file);
      }
    }
  }

  const resolvedWidth = !circle && typeof widthPx === "number" ? widthPx : size;
  const resolvedHeight = !circle && typeof heightPx === "number" ? heightPx : size;

  const containerStyle: React.CSSProperties = circle
    ? { width: size, height: size, borderRadius: "9999px" }
    : { width: resolvedWidth, height: resolvedHeight };

  return (
    <div className="inline-grid" style={{ gridTemplateColumns: "1fr" }}>
      <button
        type="button"
        onClick={handlePick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`group grid place-items-center border-2 border-dashed transition-colors ${
          isDragging 
            ? 'border-[#0F317A] bg-blue-50/50' 
            : 'border-gray-300 hover:border-[#0F317A]/50'
        }`}
        style={containerStyle}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="h-full w-full object-cover" style={circle ? { borderRadius: "9999px" } : undefined} />
        ) : initialUrl ? (
          <img src={initialUrl} alt="current" className="h-full w-full object-cover" style={circle ? { borderRadius: "9999px" } : undefined} />
        ) : (
          <div className="text-center text-gray-500">
            {placeholder ?? (
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gray-50">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 5h16v14H4z" />
                  <path d="M4 15l4-4 3 3 5-5 4 4" />
                  <path d="M12 7h.01" />
                </svg>
              </div>
            )}
            <div className="mt-2 text-sm">{isDragging ? 'Drop here' : 'Click or drag to upload'}</div>
          </div>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
    </div>
  );
}


