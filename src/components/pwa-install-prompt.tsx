"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [manualMode, setManualMode] = useState<"ios" | "generic" | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("saveit-pwa-dismissed");
    if (dismissed) return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setManualMode(null);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const fallbackTimer = window.setTimeout(() => {
      const ua = window.navigator.userAgent;
      const isIos = /iphone|ipad|ipod/i.test(ua);
      const isMobile = isIos || /android/i.test(ua);
      setManualMode(isIos ? "ios" : "generic");
      if (isMobile) setShow(true);
    }, 1800);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setManualMode((mode) => mode ?? "generic");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "dismissed") {
      localStorage.setItem("saveit-pwa-dismissed", "1");
    }
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("saveit-pwa-dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="glass rounded-2xl border border-white/10 shadow-2xl shadow-black/50 p-4 max-w-sm w-full pointer-events-auto animate-fade-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-syne font-600 text-white text-sm">
              Install SaveIt
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {manualMode === "ios"
                ? "On iPhone or iPad, open Share then Add to Home Screen."
                : manualMode === "generic"
                  ? "Open your browser menu and choose Install app or Add to Home Screen."
                  : "Add to your home screen for quick access"}
            </p>
            {manualMode && (
              <ol className="mt-2 space-y-1 text-[11px] leading-relaxed text-zinc-400">
                {manualMode === "ios" ? (
                  <>
                    <li>1. Tap the Share button in Safari.</li>
                    <li>2. Choose Add to Home Screen.</li>
                    <li>3. Tap Add.</li>
                  </>
                ) : (
                  <>
                    <li>1. Open the browser menu.</li>
                    <li>2. Choose Install app or Add to Home Screen.</li>
                  </>
                )}
              </ol>
            )}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-syne font-600 hover:opacity-90 transition-opacity"
              >
                {deferredPrompt ? "Install" : "How to install"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 rounded-xl bg-white/5 text-zinc-300 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close install prompt"
            className="text-zinc-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
