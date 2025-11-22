import React from "react";

export type ButtonVariant = "primary" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export default function Button({
  className = "",
  variant = "primary",
  fullWidth,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors";
  const byVariant: Record<ButtonVariant, string> = {
    primary: "bg-blue-500 text-white shadow-lg hover:bg-blue-600",
    outline: "border border-blue-300 bg-white text-blue-700 hover:bg-blue-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };
  const width = fullWidth ? "w-full" : "";

  return (
    <button className={`${base} ${byVariant[variant]} ${width} ${className}`} {...props} />
  );
}
