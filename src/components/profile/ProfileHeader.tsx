import React from "react";
import Button from "@/components/ui/button";

interface ProfileHeaderProps {
  onLogout: () => void;
}

export default function ProfileHeader({ onLogout }: ProfileHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and integrations</p>
      </div>
      <Button
        variant="outline"
        className="border-rose-200 text-rose-600 hover:bg-rose-50"
        onClick={onLogout}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Log out
      </Button>
    </div>
  );
}

