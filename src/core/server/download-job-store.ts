import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

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

function shouldForceTranscode() {
  return process.env.SAVEIT_FORCE_VIDEO_TRANSCODE === "1";
}

function isMp4Filename(filename: string) {
  return filename.toLowerCase().endsWith(".mp4");
}

async function makeMp4ShareFriendly(filePath: string): Promise<boolean> {
  const outputPath = `${filePath}.share.mp4`;
  const videoArgs = shouldForceTranscode()
    ? [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-profile:v",
        "main",
        "-level",
        "4.0",
        "-pix_fmt",
        "yuv420p",
      ]
    : ["-c:v", "copy"];

  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        filePath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        ...videoArgs,
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    ffmpeg.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `ffmpeg exited ${code}`));
    });
  });

  if (!existsSync(outputPath)) return false;
  unlinkSync(filePath);
  renameSync(outputPath, filePath);
  return true;
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

    if (isMp4Filename(job.filename)) {
      updateJob(id, { progress: 99 });
      try {
        await makeMp4ShareFriendly(job.filePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "MP4 remux failed";
        console.error("[download job mp4 remux]", message);
      }
    }

    const finalSize = existsSync(job.filePath)
      ? statSync(job.filePath).size
      : receivedBytes;

    updateJob(id, {
      status: "completed",
      progress: 100,
      receivedBytes: finalSize,
      totalBytes: finalSize,
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
