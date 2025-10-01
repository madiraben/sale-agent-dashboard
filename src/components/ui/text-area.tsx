import React from "react";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export default function TextArea({ label, className = "", ...props }: TextAreaProps) {
  return (
    <div>
      {label ? <label className="mb-2 block text-sm text-gray-700">{label}</label> : null}
      <textarea
        {...props}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none ring-primary/20 placeholder:text-gray-400 focus:border-primary focus:ring-2 ${className}`}
      />
    </div>
  );
}


