import React, { useState } from "react";

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function PasswordField({ label, className = "", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label ? <label className="mb-2 block text-sm text-gray-700">{label}</label> : null}
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-10 text-gray-900 outline-none placeholder:text-gray-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${className}`}
          {...props}
        />
        <button
          type="button"
          aria-label="Toggle password visibility"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-2 inline-flex items-center rounded-md px-2 text-gray-500 hover:text-gray-700"
        >
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.23 20.23 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a20.3 20.3 0 0 1-3.18 4.31M1 1l22 22" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
