"use client";

import { useState, useCallback, useRef } from "react";

export interface BatchItem {
  id: string;
  url: string;
  title: string;
  status: "pending" | "downloading" | "completed" | "failed";
  progress: number;
  receivedBytes?: number;
  totalBytes?: number;
  error?: string;
  filename?: string;
  downloadPath?: string;
}

interface UseBatchDownloadOptions {
  onComplete?: (item: BatchItem) => void;
}

export function useBatchDownload(options?: UseBatchDownloadOptions) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const itemsRef = useRef<BatchItem[]>([]);
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const abortRef = useRef(false);

  const updateItems = useCallback(
    (updater: (current: BatchItem[]) => BatchItem[]) => {
      const next = updater(itemsRef.current);
      itemsRef.current = next;
      setItems(next);
      return next;
    },
    [],
  );

  const addToQueue = useCallback(
    (newItems: Omit<BatchItem, "id" | "status" | "progress">[]) => {
      const itemsWithIds = newItems.map((item, i) => ({
        ...item,
        id: `batch-${Date.now()}-${i}`,
        status: "pending" as const,
        progress: 0,
      }));
      updateItems((prev) => [...prev, ...itemsWithIds]);
    },
    [updateItems],
  );

  const startBatch = useCallback(async () => {
    setActive(true);
    setMinimized(false);
    abortRef.current = false;

    updateItems((prev) => {
      const pending = prev.filter((i) => i.status === "pending");
      const done = prev.filter((i) => i.status !== "pending");
      return [...done, ...pending];
    });

    let currentItems = itemsRef.current;

    while (currentItems.some((i) => i.status === "pending")) {
      if (abortRef.current) break;

      const nextIdx = currentItems.findIndex((i) => i.status === "pending");
      if (nextIdx === -1) break;

      const item = currentItems[nextIdx];

      updateItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "downloading",
                progress: 0,
                receivedBytes: 0,
                totalBytes: undefined,
              }
            : i,
        ),
      );

      try {
        const response = await fetch(item.downloadPath!, {
          signal: AbortSignal.timeout(3_600_000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentLength = Number(response.headers.get("content-length"));
        updateItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  totalBytes: contentLength > 0 ? contentLength : undefined,
                }
              : i,
          ),
        );
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        let received = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
          if (abortRef.current) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          received += value.length;

          const progress = contentLength > 0
            ? Math.round((received / contentLength) * 100)
            : 0;

          updateItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, progress, receivedBytes: received }
                : i,
            ),
          );
        }

        if (abortRef.current) {
          updateItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "failed", error: "Cancelled" }
                : i,
            ),
          );
          break;
        }

        const blob = new Blob(chunks as BlobPart[]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.filename ?? "download.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);

        updateItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "completed",
                  progress: 100,
                  receivedBytes: received,
                }
              : i,
          ),
        );

        options?.onComplete?.({ ...item, status: "completed", progress: 100 });
      } catch (err: unknown) {
        if (abortRef.current) break;
        const message = err instanceof Error ? err.message : "Failed";
        updateItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "failed", error: message }
              : i,
          ),
        );
      }

      currentItems = itemsRef.current;
    }

    setActive(false);
  }, [options, updateItems]);

  const cancelAll = useCallback(() => {
    abortRef.current = true;
  }, []);

  const retryFailed = useCallback(() => {
    updateItems((prev) =>
      prev.map((i) =>
        i.status === "failed"
          ? {
              ...i,
              status: "pending",
              progress: 0,
              receivedBytes: 0,
              totalBytes: undefined,
              error: undefined,
            }
          : i,
      ),
    );
    setActive(true);
    setTimeout(() => startBatch(), 0);
  }, [startBatch, updateItems]);

  const clearCompleted = useCallback(() => {
    updateItems((prev) => prev.filter((i) => i.status !== "completed"));
  }, [updateItems]);

  const removeItem = useCallback((id: string) => {
    updateItems((prev) => prev.filter((i) => i.id !== id));
  }, [updateItems]);

  const completed = items.filter((i) => i.status === "completed").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const total = items.length;
  const pending = items.filter((i) => i.status === "pending").length;
  const downloading = items.filter((i) => i.status === "downloading").length;

  return {
    items,
    active,
    minimized,
    setMinimized,
    addToQueue,
    startBatch,
    cancelAll,
    retryFailed,
    clearCompleted,
    removeItem,
    completed,
    failed,
    total,
    pending,
    downloading,
  };
}
