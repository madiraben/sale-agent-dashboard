import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export default function Card({ className = "", padded = true, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white ${padded ? "p-4 md:p-6" : ""} shadow-sm ring-1 ring-black/5 ${className}`}
      {...props}
    />
  );
}


