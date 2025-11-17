import React from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";

interface SubscriptionCardProps {
  billing: {
    active: boolean;
    plan?: string | null;
    renew?: string | null;
  } | null;
  portalLoading: boolean;
  onManage: () => void;
  getPlanLabel: (plan?: string | null) => string;
  formatDate: (iso?: string | null) => string;
}

export default function SubscriptionCard({
  billing,
  portalLoading,
  onManage,
  getPlanLabel,
  formatDate,
}: SubscriptionCardProps) {
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
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Subscription
        </h2>
      </div>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Status</span>
            <Badge variant={billing?.active ? "success" : "warning"}>
              {billing?.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Plan</span>
          <Badge variant="muted" className="font-medium">
            {getPlanLabel(billing?.plan)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Renews</span>
          <span className="text-sm font-medium text-gray-900">{formatDate(billing?.renew)}</span>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t">
        <Button onClick={onManage} disabled={portalLoading} className="w-full shadow-sm">
          {portalLoading ? "Opening..." : "Manage Billing"}
        </Button>
      </div>
    </Card>
  );
}

