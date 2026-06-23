"use client";

import { useState } from "react";
import type { SocialImageAsset } from "@/core/services/social-image.service";
import Spinner from "@/components/ui/spinner";

export type ImageDownloadFormat = "original" | "jpg" | "png";

interface ImageMediaGalleryProps {
  images: SocialImageAsset[];
  platformLabel: string;
  onQueueImageDownload?: (
    image: SocialImageAsset,
    format: ImageDownloadFormat,
  ) => void;
}

function ImageCard({
  image,
  platformLabel,
  onDownload,
}: {
  image: SocialImageAsset;
  platformLabel: string;
  onDownload: (image: SocialImageAsset, format: ImageDownloadFormat) => void;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-black/20">
      <div className="relative aspect-square bg-zinc-900">
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500">
            <Spinner />
            <span>Loading preview...</span>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-red-400">
            Preview failed to load. The download may still be available.
          </div>
        )}
        <img
          src={image.previewPath}
          alt={`${platformLabel} image ${image.index + 1}`}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`h-full w-full object-cover transition-opacity ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] border-t border-white/6 bg-white/[0.03]">
        <button
          type="button"
          onClick={() => onDownload(image, "original")}
          className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-syne font-600 text-white hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M12 16l-6-6h4V4h4v6h4l-6 6zm-7 2h14v2H5v-2z" />
          </svg>
          Original {image.extension.toUpperCase()}
        </button>
        <button
          type="button"
          onClick={() => onDownload(image, "jpg")}
          className="border-l border-white/6 px-3 py-2.5 text-xs font-syne font-600 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          JPG
        </button>
        <button
          type="button"
          onClick={() => onDownload(image, "png")}
          className="border-l border-white/6 px-3 py-2.5 text-xs font-syne font-600 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          PNG
        </button>
      </div>
    </div>
  );
}

export default function ImageMediaGallery({
  images,
  platformLabel,
  onQueueImageDownload,
}: ImageMediaGalleryProps) {
  const queueImageDownload = (
    image: SocialImageAsset,
    format: ImageDownloadFormat,
  ) => {
    onQueueImageDownload?.(image, format);
  };

  if (!images.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
          Images
        </p>
        <span className="text-xs text-zinc-600">
          {images.length} {images.length === 1 ? "image" : "images"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {images.map((image) => (
          <ImageCard
            key={image.index}
            image={image}
            platformLabel={platformLabel}
            onDownload={queueImageDownload}
          />
        ))}
      </div>
    </div>
  );
}
