import React, { useState } from "react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";

interface FacebookIntegrationProps {
  fb: any;
  availablePages: Array<{ id: string; name: string }>;
  fbBusy: boolean;
  onConnect: (pageId: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRemovePage: (pageId: string) => Promise<void>;
  onToggleActive: (pageId: string, active: boolean) => Promise<void>;
}

export default function FacebookIntegration({
  fb,
  availablePages,
  fbBusy,
  onConnect,
  onDisconnect,
  onRemovePage,
  onToggleActive,
}: FacebookIntegrationProps) {
  const [selectedPageId, setSelectedPageId] = useState<string>("");

  const handleConnect = async () => {
    if (selectedPageId) {
      await onConnect(selectedPageId);
      setSelectedPageId("");
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Facebook Messenger</h3>
            <p className="text-sm text-gray-600">Connect your Facebook pages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/facebook/oauth/start">
            <Button variant="outline" className="bg-white shadow-sm">
              {fb?.id ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reconnect
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Connect
                </>
              )}
            </Button>
          </a>
          {fb?.id && (
            <Button
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 bg-white shadow-sm"
              onClick={onDisconnect}
              disabled={fbBusy}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Disconnect
            </Button>
          )}
        </div>
      </div>
      <FacebookProfileSection
        fb={fb}
        availablePages={availablePages}
        selectedPageId={selectedPageId}
        setSelectedPageId={setSelectedPageId}
        fbBusy={fbBusy}
        onConnect={handleConnect}
        onRemovePage={onRemovePage}
        onToggleActive={onToggleActive}
      />
    </div>
  );
}

interface FacebookProfileSectionProps {
  fb: any;
  availablePages: Array<{ id: string; name: string }>;
  selectedPageId: string;
  setSelectedPageId: (id: string) => void;
  fbBusy: boolean;
  onConnect: () => void;
  onRemovePage: (pageId: string) => void;
  onToggleActive: (pageId: string, active: boolean) => void;
}

function FacebookProfileSection({
  fb,
  availablePages,
  selectedPageId,
  setSelectedPageId,
  fbBusy,
  onConnect,
  onRemovePage,
  onToggleActive,
}: FacebookProfileSectionProps) {
  if (!fb?.id && !fb?.profile && !(Array.isArray(fb?.pages) && fb.pages.length > 0)) {
    return (
      <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm text-center">
        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-gray-600">Not connected yet</div>
        <div className="text-xs text-gray-500 mt-1">Click Connect to get started</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
      {fb?.profile && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-200">
          {fb.profile.picture ? (
            <img
              src={fb.profile.picture}
              alt="Profile"
              className="w-10 h-10 rounded-full ring-2 ring-white shadow"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-sm font-semibold shadow">
              {fb.profile.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">{fb.profile.name || "Facebook User"}</div>
            {fb.profile.email && <div className="text-xs text-gray-600">{fb.profile.email}</div>}
          </div>
        </div>
      )}

      {Array.isArray((fb as any)?.active_pages) && (fb as any).active_pages.length > 0 && (
        <div className="px-4 py-3 border-b border-blue-100">
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Pages</span>
          <div className="flex flex-col gap-2">
            {(fb as any).active_pages.map((ap: any) => (
              <div key={ap.id} className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                {ap.picture ? (
                  <img src={ap.picture} alt="Page" className="w-8 h-8 rounded-full ring-1 ring-blue-300 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold shadow-sm">
                    {(ap.name || ap.id || "?").toString().charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-gray-900">{ap.name || ap.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!Array.isArray((fb as any)?.active_pages) && fb?.id && (
        <div className="px-4 py-3 border-b border-blue-100">
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Active Page</span>
          <div className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
            {fb && (fb as any).page_picture ? (
              <img
                src={(fb as any).page_picture as string}
                alt="Page"
                className="w-8 h-8 rounded-full ring-1 ring-blue-300 shadow-sm"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold shadow-sm">
                {(fb?.name || fb?.id || "?").toString().charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-medium text-gray-900">{fb?.name || fb?.id}</span>
          </div>
        </div>
      )}

      {Array.isArray(fb?.pages) && fb.pages.length > 0 && (
        <div className="px-4 py-3 border-b border-blue-100">
          <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Manage Pages</span>
          <div className="space-y-2">
            {fb.pages.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    checked={!!p.is_active}
                    onChange={(e) => onToggleActive(p.id, e.target.checked)}
                    disabled={fbBusy}
                  />
                  <span className="text-sm font-medium text-gray-900">{p.name || p.id}</span>
                  {p.is_active && <Badge variant="success">Active</Badge>}
                </div>
                <Button
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs py-1 px-2"
                  onClick={() => onRemovePage(p.id)}
                  disabled={fbBusy}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-gray-50">
        <span className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Add Another Page</span>
        <div className="flex items-center gap-2">
          <select
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            disabled={fbBusy}
          >
            <option value="">Select a page...</option>
            {availablePages
              .filter((p) => !(Array.isArray(fb?.pages) && fb.pages.some((c: any) => c.id === p.id)))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.id}
                </option>
              ))}
          </select>
          <Button variant="outline" className="bg-white shadow-sm" onClick={onConnect} disabled={!selectedPageId || fbBusy}>
            {fbBusy ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

