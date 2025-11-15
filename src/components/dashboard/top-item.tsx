import React from "react";

type TopItemProps = {
  avatar?: React.ReactNode;
  title: string;
  subtitle?: string;
  amount: string;
  percent?: string;
};

export default function TopItem({ avatar, title, subtitle, amount, percent }: TopItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-brand-subtle p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
          {avatar}
        </span>
        <div>
          <div className="font-semibold text-gray-900">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-gray-900">{amount}</div>
        {percent ? <div className="text-xs font-semibold text-brand">{percent}</div> : null}
      </div>
    </div>
  );
}


