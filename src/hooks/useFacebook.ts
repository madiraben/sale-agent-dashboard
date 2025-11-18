"use client";

import { useState, useEffect } from "react";

export function useFacebook() {
  const [fb, setFb] = useState<any>(null);
  const [availablePages, setAvailablePages] = useState<Array<{ id: string; name: string }>>([]);
  const [fbBusy, setFbBusy] = useState(false);

  useEffect(() => {
    loadFbAll();
  }, []);

  async function loadFbAll() {
    try {
      const [connected, pages] = await Promise.all([
        fetch("/api/facebook/connected").then((r) => r.json()),
        fetch("/api/facebook/pages").then((r) => r.json()).catch(() => ({ pages: [] })),
      ]);
      setFb(connected);
      const list = Array.isArray(pages?.pages)
        ? pages.pages.map((p: any) => ({ id: p.id, name: p.name }))
        : [];
      setAvailablePages(list);
    } catch {
      // ignore
    }
  }

  async function refreshFb() {
    await loadFbAll();
  }

  async function connectPage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/pages/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function setActivePage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/connected/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function disconnectFacebook() {
    if (fbBusy) return;
    setFbBusy(true);
    try {
      await fetch("/api/facebook/connected", { method: "DELETE" });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function removePage(pageId: string) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch(`/api/facebook/pages/${pageId}`, { method: "DELETE" });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  async function toggleActive(pageId: string, active: boolean) {
    if (!pageId || fbBusy) return;
    setFbBusy(true);
    try {
      await fetch(`/api/facebook/pages/${pageId}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      await refreshFb();
    } finally {
      setFbBusy(false);
    }
  }

  return {
    fb,
    availablePages,
    fbBusy,
    connectPage,
    setActivePage,
    disconnectFacebook,
    removePage,
    toggleActive,
    refreshFb,
  };
}

