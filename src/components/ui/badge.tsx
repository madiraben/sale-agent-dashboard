import React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export default function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  const byVariant: Record<BadgeVariant, string> = {
    default: "border-gray-200 bg-gray-100 text-gray-700",
    success: "border-emerald-200 bg-emerald-100 text-emerald-700",
    warning: "border-amber-200 bg-amber-100 text-amber-700",
    danger: "border-rose-200 bg-rose-100 text-rose-700",
    muted: "border-gray-200 bg-white text-gray-700",
  };

  return <span className={`${base} ${byVariant[variant]} ${className}`} {...props} />;
}


