"use client";

import { useCallback, useEffect, useState } from "react";
import { detectPlatform, type InstallPlatform } from "@/lib/installApp";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Saved by the early script in the root layout, so an event that fires before React loads isn't missed. */
    __installPrompt?: BeforeInstallPromptEvent | null;
  }
}

export interface InstallState {
  /** The browser can show its own install dialog right now (Chrome and Edge, Android and desktop). */
  canPrompt: boolean;
  /** Already running as an installed app, so there's nothing to offer. */
  installed: boolean;
  platform: InstallPlatform;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

/** Whether the app can be installed in one tap, and the way to trigger it. */
export function useInstallPrompt(): InstallState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setPromptEvent(window.__installPrompt ?? null);

    const onReady = () => setPromptEvent(window.__installPrompt ?? null);
    const onInstalled = () => {
      window.__installPrompt = null;
      setPromptEvent(null);
      setInstalled(true);
    };
    window.addEventListener("installpromptready", onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("installpromptready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const event = window.__installPrompt ?? promptEvent;
    if (!event) return "unavailable" as const;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // The browser lets each saved event be used once.
    window.__installPrompt = null;
    setPromptEvent(null);
    if (outcome === "accepted") setInstalled(true);
    return outcome;
  }, [promptEvent]);

  return { canPrompt: promptEvent !== null && !installed, installed, platform, promptInstall };
}
