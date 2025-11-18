"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);
  const [tgToken, setTgToken] = useState<string>("");
  const [tgBusy, setTgBusy] = useState(false);

  useEffect(() => {
    loadTg();
  }, []);

  async function loadTg() {
    try {
      const data = await fetch("/api/telegram/connected")
        .then((r) => r.json())
        .catch(() => ({}));
      setTg(data && (data.username || data.id) ? data : null);
    } catch {}
  }

  async function connectTelegram() {
    if (!tgToken || tgBusy) return;
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: tgToken }),
      });
      if (res.ok) {
        toast.success("Telegram bot connected successfully!");
        setTgToken("");
        await loadTg();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to connect Telegram bot. Please check your token.");
      }
    } catch (error) {
      toast.error("An error occurred while connecting Telegram bot.");
    } finally {
      setTgBusy(false);
    }
  }

  async function disconnectTelegram() {
    if (tgBusy) return;
    setTgBusy(true);
    try {
      const res = await fetch("/api/telegram/connected", { method: "DELETE" });
      if (res.ok) {
        toast.success("Telegram bot disconnected successfully!");
        await loadTg();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to disconnect Telegram bot.");
      }
    } catch (error) {
      toast.error("An error occurred while disconnecting Telegram bot.");
    } finally {
      setTgBusy(false);
    }
  }

  return {
    tg,
    tgToken,
    setTgToken,
    tgBusy,
    connectTelegram,
    disconnectTelegram,
  };
}

