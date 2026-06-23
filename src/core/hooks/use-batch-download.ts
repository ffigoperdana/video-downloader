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
  serverJobId?: string;
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
  const activeJobIdsRef = useRef<Set<string>>(new Set());

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

      let serverJobId: string | undefined;
      try {
        const startResponse = await fetch("/internal/progress/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            downloadPath: item.downloadPath,
            filename: item.filename ?? "download",
            title: item.title,
          }),
        });

        if (!startResponse.ok) {
          const payload = await startResponse.json().catch(() => ({}));
          throw new Error(payload.error ?? `HTTP ${startResponse.status}`);
        }

        const { job } = await startResponse.json();
        if (!job?.id) throw new Error("Download job was not created");
        const jobId = String(job.id);
        serverJobId = jobId;
        activeJobIdsRef.current.add(jobId);
        updateItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  serverJobId: jobId,
                  totalBytes: job.totalBytes,
                }
              : i,
          ),
        );

        let latestJob = job;

        while (!abortRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 700));

          const statusResponse = await fetch(`/internal/progress/status?id=${jobId}`, {
            cache: "no-store",
          });
          if (!statusResponse.ok) throw new Error(`HTTP ${statusResponse.status}`);
          const statusPayload = await statusResponse.json();
          latestJob = statusPayload.job;

          updateItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    progress: latestJob.progress ?? 0,
                    receivedBytes: latestJob.receivedBytes,
                    totalBytes: latestJob.totalBytes,
                  }
                : i,
            ),
          );

          if (latestJob.status === "completed") break;
          if (latestJob.status === "failed" || latestJob.status === "cancelled") {
            throw new Error(latestJob.error ?? latestJob.status);
          }
        }

        if (abortRef.current) {
          await fetch("/internal/progress/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: jobId }),
          }).catch(() => {});
          updateItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "failed", error: "Cancelled" }
                : i,
            ),
          );
          break;
        }

        const a = document.createElement("a");
        a.href = `/internal/progress/file?id=${jobId}`;
        a.download = item.filename ?? "download.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        activeJobIdsRef.current.delete(jobId);

        updateItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "completed",
                  progress: 100,
                  receivedBytes: latestJob.receivedBytes,
                  totalBytes: latestJob.totalBytes,
                }
              : i,
          ),
        );

        options?.onComplete?.({ ...item, status: "completed", progress: 100 });
      } catch (err: unknown) {
        if (serverJobId) activeJobIdsRef.current.delete(serverJobId);
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
    for (const id of activeJobIdsRef.current) {
      void fetch("/internal/progress/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
    }
    activeJobIdsRef.current.clear();
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
