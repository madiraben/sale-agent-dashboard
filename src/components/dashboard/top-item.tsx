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
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500">
          {avatar}
        </span>
        <div>
          <div className="font-medium text-gray-900">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500">{subtitle}</div> : null}
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium text-gray-900">{amount}</div>
        {percent ? <div className="text-xs font-medium text-emerald-600">{percent}</div> : null}
      </div>
    </div>
  );
}


