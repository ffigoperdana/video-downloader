import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type DownloadJobStatus = "pending" | "downloading" | "completed" | "failed" | "cancelled";

export interface DownloadJobSnapshot {
  id: string;
  title: string;
  filename: string;
  status: DownloadJobStatus;
  progress: number;
  receivedBytes: number;
  totalBytes?: number;
  error?: string;
}

interface DownloadJob extends DownloadJobSnapshot {
  filePath: string;
  controller: AbortController;
  cleanupTimer?: NodeJS.Timeout;
}

const allowedInternalPrefixes = [
  "/internal/download/",
  "/internal/media/",
];

const jobs = ((globalThis as typeof globalThis & {
  __saveitDownloadJobs?: Map<string, DownloadJob>;
}).__saveitDownloadJobs ??= new Map<string, DownloadJob>());

const downloadDir = join(tmpdir(), "saveit-downloads");
let staleCleanupRan = false;

function ensureDownloadDir() {
  if (!existsSync(downloadDir)) mkdirSync(downloadDir, { recursive: true });
  if (staleCleanupRan) return;
  staleCleanupRan = true;
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const name of readdirSync(downloadDir)) {
    const filePath = join(downloadDir, name);
    try {
      if (statSync(filePath).mtimeMs < cutoff) unlinkSync(filePath);
    } catch {}
  }
}

function sanitizeFilename(filename: string): string {
  const safe = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim();
  return (safe || "download").slice(0, 120);
}

function resolveDownloadUrl(origin: string, downloadPath: string): URL {
  const resolved = new URL(downloadPath, origin);
  const requestOrigin = new URL(origin);
  if (resolved.origin !== requestOrigin.origin) {
    throw new Error("Only same-origin download paths are allowed");
  }
  if (!allowedInternalPrefixes.some((prefix) => resolved.pathname.startsWith(prefix))) {
    throw new Error("Unsupported download path");
  }
  return resolved;
}

function updateJob(id: string, patch: Partial<DownloadJob>) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.set(id, { ...job, ...patch });
}

function scheduleCleanup(job: DownloadJob) {
  if (job.cleanupTimer) clearTimeout(job.cleanupTimer);
  job.cleanupTimer = setTimeout(() => {
    const current = jobs.get(job.id);
    if (current?.filePath && existsSync(current.filePath)) {
      try {
        unlinkSync(current.filePath);
      } catch {}
    }
    jobs.delete(job.id);
  }, 30 * 60 * 1000);
}

async function runDownloadJob(id: string, origin: string, downloadPath: string) {
  const job = jobs.get(id);
  if (!job) return;

  try {
    const url = resolveDownloadUrl(origin, downloadPath);
    updateJob(id, { status: "downloading", progress: 0 });

    const response = await fetch(url, {
      signal: job.controller.signal,
      cache: "no-store",
    });
    if (!response.ok || !response.body) {
      throw new Error(`Download returned HTTP ${response.status}`);
    }

    const totalBytes = Number(response.headers.get("content-length")) || undefined;
    updateJob(id, { totalBytes });

    const reader = response.body.getReader();
    const writer = createWriteStream(job.filePath!);
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (job.controller.signal.aborted) throw new Error("Cancelled");

      receivedBytes += value.length;
      if (!writer.write(Buffer.from(value))) {
        await new Promise<void>((resolve, reject) => {
          writer.once("drain", resolve);
          writer.once("error", reject);
        });
      }

      updateJob(id, {
        receivedBytes,
        progress: totalBytes ? Math.min(99, Math.round((receivedBytes / totalBytes) * 100)) : 0,
      });
    }

    await new Promise<void>((resolve, reject) => {
      writer.end(resolve);
      writer.once("error", reject);
    });

    updateJob(id, {
      status: "completed",
      progress: 100,
      receivedBytes,
      totalBytes: totalBytes ?? receivedBytes,
    });
    const completed = jobs.get(id);
    if (completed) scheduleCleanup(completed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    const current = jobs.get(id);
    if (current?.filePath && existsSync(current.filePath)) {
      try {
        unlinkSync(current.filePath);
      } catch {}
    }
    updateJob(id, {
      status: message === "Cancelled" ? "cancelled" : "failed",
      error: message,
    });
  }
}

export function createDownloadJob(input: {
  origin: string;
  downloadPath: string;
  filename: string;
  title: string;
}): DownloadJobSnapshot {
  ensureDownloadDir();
  resolveDownloadUrl(input.origin, input.downloadPath);

  const id = randomUUID();
  const filename = sanitizeFilename(input.filename);
  const job: DownloadJob = {
    id,
    title: input.title,
    filename,
    status: "pending",
    progress: 0,
    receivedBytes: 0,
    filePath: join(downloadDir, `${id}-${filename}`),
    controller: new AbortController(),
  };
  jobs.set(id, job);
  void runDownloadJob(id, input.origin, input.downloadPath);
  return getDownloadJob(id)!;
}

export function getDownloadJob(id: string): DownloadJobSnapshot | null {
  const job = jobs.get(id);
  if (!job) return null;
  const {
    controller: _controller,
    cleanupTimer: _cleanupTimer,
    filePath: _filePath,
    ...snapshot
  } = job;
  return snapshot;
}

export function cancelDownloadJob(id: string): DownloadJobSnapshot | null {
  const job = jobs.get(id);
  if (!job) return null;
  job.controller.abort();
  updateJob(id, { status: "cancelled", error: "Cancelled" });
  return getDownloadJob(id);
}

export async function getCompletedDownloadFile(id: string) {
  const job = jobs.get(id);
  if (!job || job.status !== "completed" || !job.filePath || !existsSync(job.filePath)) {
    return null;
  }
  return {
    filename: job.filename,
    size: (await stat(job.filePath)).size,
    stream: createReadStream(job.filePath),
  };
}
