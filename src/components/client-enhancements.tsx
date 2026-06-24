"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const OfflineIndicator = dynamic(() => import("./offline-indicator"), {
  ssr: false,
});

const PwaInstallPrompt = dynamic(() => import("./pwa-install-prompt"), {
  ssr: false,
});

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

export default function ClientEnhancements() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(() => setReady(true), {
        timeout: 2500,
      });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <>
      <OfflineIndicator />
      <PwaInstallPrompt />
    </>
  );
}
