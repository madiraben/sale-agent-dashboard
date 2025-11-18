import React from "react";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";

interface PaymentMethodCardProps {
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  portalLoading: boolean;
  onManage: () => void;
}

export default function PaymentMethodCard({ card, portalLoading, onManage }: PaymentMethodCardProps) {
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
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          Payment Method
        </h2>
      </div>
      {card ? (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 text-white shadow-lg mb-4">
          <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Card on file</div>
          <div className="text-lg font-semibold mb-1">
            {card.brand.toUpperCase()} •••• {card.last4}
          </div>
          <div className="text-sm opacity-70">
            Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
          </div>
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed rounded-lg mb-4">
          <svg
            className="w-8 h-8 text-gray-400 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          <div className="text-sm text-gray-500">No card on file</div>
        </div>
      )}
      <Button variant="outline" onClick={onManage} disabled={portalLoading} className="w-full shadow-sm">
        {portalLoading ? "Opening..." : card ? "Update Card" : "Add Card"}
      </Button>
    </Card>
  );
}

