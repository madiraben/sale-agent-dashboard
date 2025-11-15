import React from "react";

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  rightIcon?: React.ReactNode;
};

export default function TextField({ label, rightIcon, className = "", ...props }: TextFieldProps) {
  return (
    <div>
      {label ? <label className="mb-2 block text-sm text-gray-700">{label}</label> : null}
      <div className="relative">
        <input
          className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 outline-none placeholder:text-gray-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${className}`}
          {...props}
        />
        {rightIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-gray-400">
            {rightIcon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
