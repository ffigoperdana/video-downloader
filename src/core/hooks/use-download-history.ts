"use client";

import { useState, useCallback, useEffect } from "react";

export interface DownloadHistoryEntry {
  id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  quality: string;
  timestamp: number;
  filename: string;
  status: "completed" | "failed";
}

const STORAGE_KEY = "saveit-download-history";
const MAX_ENTRIES = 100;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadEntries(): DownloadHistoryEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: DownloadHistoryEntry[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function useDownloadHistory() {
  const [entries, setEntries] = useState<DownloadHistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEntries(loadEntries());
    setHydrated(true);
  }, []);

  const addEntry = useCallback(
    (
      entry: Omit<DownloadHistoryEntry, "id" | "timestamp">,
    ) => {
      const newEntry: DownloadHistoryEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const updated = [newEntry, ...prev].slice(0, MAX_ENTRIES);
        saveEntries(updated);
        return updated;
      });
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setEntries([]);
    saveEntries([]);
  }, []);

  return { entries, addEntry, removeEntry, clearHistory, hydrated };
}
