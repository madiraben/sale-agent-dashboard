"use client";

import React from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDialog({ open, title = "Confirm", description, confirmText = "Confirm", cancelText = "Cancel", destructive = false, busy = false, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(o) => { if (!o) onCancel(); }}
      title={title}
      widthClassName="max-w-md"
      footer={(
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>{cancelText}</Button>
          <Button onClick={onConfirm} disabled={busy} className={destructive ? "border-rose-200 bg-rose-600 text-white hover:bg-rose-700" : undefined}>
            {busy ? "Working..." : confirmText}
          </Button>
        </div>
      )}
    >
      {description ? <div className="text-gray-700">{description}</div> : null}
    </Modal>
  );
}


