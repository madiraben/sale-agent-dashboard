import React from "react";

type StatCardProps = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
};

export default function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand">{icon}</span>
        <div>
          <div className="text-xl font-bold text-brand">{value}</div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
        </div>
      </div>
    </div>
  );
}


