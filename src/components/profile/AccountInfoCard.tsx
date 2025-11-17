import React from "react";
import Card from "@/components/ui/card";
import TextField from "@/components/ui/text-field";

interface AccountInfoCardProps {
  email: string;
}

export default function AccountInfoCard({ email }: AccountInfoCardProps) {
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Account Information
        </h2>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <TextField type="email" value={email} disabled />
      </div>
    </Card>
  );
}

