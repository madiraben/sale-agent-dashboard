import React from "react";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  round?: boolean;
};

export default function IconButton({ className = "", round = true, children, ...props }: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 ${
        round ? "h-9 w-9 rounded-full" : "h-8 w-8 rounded-lg"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}


