import React from "react";
import Card from "@/components/ui/card";
import FacebookIntegration from "./FacebookIntegration";
import TelegramIntegration from "./TelegramIntegration";

interface SocialIntegrationsCardProps {
  facebook: {
    fb: any;
    availablePages: Array<{ id: string; name: string }>;
    fbBusy: boolean;
    connectPage: (pageId: string) => Promise<void>;
    disconnectFacebook: () => Promise<void>;
    removePage: (pageId: string) => Promise<void>;
    toggleActive: (pageId: string, active: boolean) => Promise<void>;
  };
  telegram: {
    tg: any;
    tgToken: string;
    setTgToken: (token: string) => void;
    tgBusy: boolean;
    connectTelegram: () => Promise<void>;
    disconnectTelegram: () => Promise<void>;
  };
  onShowTelegramGuide: () => void;
}

export default function SocialIntegrationsCard({
  facebook,
  telegram,
  onShowTelegramGuide,
}: SocialIntegrationsCardProps) {
  return (
    <Card>
      <div className="border-b pb-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Social Integrations
        </h2>
        <p className="text-sm text-gray-500 mt-1">Connect your social media accounts to enable bot features</p>
      </div>

      <div className="space-y-6">
        <FacebookIntegration
          fb={facebook.fb}
          availablePages={facebook.availablePages}
          fbBusy={facebook.fbBusy}
          onConnect={facebook.connectPage}
          onDisconnect={facebook.disconnectFacebook}
          onRemovePage={facebook.removePage}
          onToggleActive={facebook.toggleActive}
        />

        <TelegramIntegration
          tg={telegram.tg}
          tgToken={telegram.tgToken}
          setTgToken={telegram.setTgToken}
          tgBusy={telegram.tgBusy}
          onConnect={telegram.connectTelegram}
          onDisconnect={telegram.disconnectTelegram}
          onShowGuide={onShowTelegramGuide}
        />
      </div>
    </Card>
  );
}

