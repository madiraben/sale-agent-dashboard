import React from "react";
import Card from "@/components/ui/card";

type SectionProps = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function Section({ title, actions, children }: SectionProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {actions ? <div className="flex items-center gap-2 text-gray-500">{actions}</div> : null}
      </div>
      {children}
    </Card>
  );
}


