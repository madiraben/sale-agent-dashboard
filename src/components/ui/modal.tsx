import React from "react";
import IconButton from "@/components/ui/icon-button";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
};

export default function Modal({ open, onOpenChange, title, children, footer, widthClassName = "max-w-lg" }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className={`absolute left-1/2 top-1/2 w-full ${widthClassName} -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <IconButton round onClick={() => onOpenChange(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
        <div className="text-sm">{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}


