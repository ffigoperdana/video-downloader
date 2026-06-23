import { spawn } from "node:child_process";

interface CompatibleMp4Options {
  inputHeaders?: string;
  logPrefix?: string;
}

const commonMp4OutputArgs = [
  "-map",
  "0:v:0",
  "-map",
  "0:a?",
];

const fastCompatibleMp4Args = [
  ...commonMp4OutputArgs,
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "frag_keyframe+empty_moov+default_base_moof",
  "-f",
  "mp4",
  "pipe:1",
];

const strictCompatibleMp4Args = [
  ...commonMp4OutputArgs,
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
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "frag_keyframe+empty_moov+default_base_moof",
  "-f",
  "mp4",
  "pipe:1",
];

function shouldForceTranscode() {
  return process.env.SAVEIT_FORCE_VIDEO_TRANSCODE === "1";
}

export function createCompatibleMp4Stream(
  input: NodeJS.ReadableStream | string,
  options: CompatibleMp4Options = {},
): NodeJS.ReadableStream {
  const isRemoteInput = typeof input === "string";
  const inputArgs = [
    ...(options.inputHeaders ? ["-headers", options.inputHeaders] : []),
    "-i",
    isRemoteInput ? input : "pipe:0",
  ];
  const outputArgs = shouldForceTranscode()
    ? strictCompatibleMp4Args
    : fastCompatibleMp4Args;

  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      ...inputArgs,
      ...outputArgs,
    ],
    { stdio: [isRemoteInput ? "ignore" : "pipe", "pipe", "pipe"] },
  );

  if (!ffmpeg.stdout || !ffmpeg.stderr) {
    throw new Error("Failed to start ffmpeg");
  }

  if (!isRemoteInput) {
    if (!ffmpeg.stdin) throw new Error("Failed to open ffmpeg stdin");
    const stdin = ffmpeg.stdin;
    input.on("error", (error: Error) => {
      console.error(`[${options.logPrefix ?? "media"} input]`, error.message);
      stdin.destroy(error);
    });
    input.pipe(stdin);
  }

  ffmpeg.stderr.on("data", (chunk) =>
    console.error(
      `[${options.logPrefix ?? "media"} ffmpeg]`,
      chunk.toString().trim(),
    ),
  );

  return ffmpeg.stdout;
}

export function nodeStreamToWebResponse(
  stream: NodeJS.ReadableStream,
  headers: HeadersInit,
): Response {
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (error: Error) => controller.error(error));
    },
    cancel() {
      const destroyable = stream as { destroy?: () => void };
      destroyable.destroy?.();
    },
  });

  return new Response(webStream, { headers });
}
