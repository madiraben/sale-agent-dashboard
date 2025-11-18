import React from "react";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";

interface WorkspacesCardProps {
  tenants: Array<{ id: string; name: string; role: string }>;
}

export default function WorkspacesCard({ tenants }: WorkspacesCardProps) {
  return (
    <Card>
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          Workspaces
        </h2>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{t.name ?? t.id}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      t.role === "owner" ? "success" : t.role === "admin" ? "default" : "muted"
                    }
                  >
                    {t.role}
                  </Badge>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                  No workspaces
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

