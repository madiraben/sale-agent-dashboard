import React from "react";
import Button from "@/components/ui/button";
import TextField from "@/components/ui/text-field";

interface TelegramIntegrationProps {
  tg: any;
  tgToken: string;
  setTgToken: (token: string) => void;
  tgBusy: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onShowGuide: () => void;
}

export default function TelegramIntegration({
  tg,
  tgToken,
  setTgToken,
  tgBusy,
  onConnect,
  onDisconnect,
  onShowGuide,
}: TelegramIntegrationProps) {
  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-100">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base">Telegram Bot</h3>
          <p className="text-sm text-gray-600">Enable RAG-powered bot for Telegram</p>
        </div>
      </div>

      {tg ? (
        <div className="bg-white rounded-lg p-4 border border-cyan-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">@{tg.username || tg.id}</div>
                <div className="text-xs text-gray-500">Connected bot</div>
              </div>
            </div>
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 bg-white shadow-sm"
              onClick={onDisconnect}
              disabled={tgBusy}
            >
              {tgBusy ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Disconnecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Disconnect
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 border border-cyan-200 shadow-sm">
          <div className="space-y-3">
            <TextField
              placeholder="Paste your BotFather token here..."
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tgToken && !tgBusy) {
                  onConnect();
                }
              }}
              disabled={tgBusy}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Get your token from @BotFather •{" "}
                <button onClick={onShowGuide} className="text-cyan-600 hover:text-cyan-700 font-medium underline">
                  View Guide
                </button>
              </div>
              <Button onClick={onConnect} disabled={!tgToken || tgBusy} className="shadow-sm">
                {tgBusy ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Connect Bot
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

