import type { SocialImageAsset } from "@/core/services/social-image.service";

interface ImageMediaGalleryProps {
  images: SocialImageAsset[];
  platformLabel: string;
}

export default function ImageMediaGallery({
  images,
  platformLabel,
}: ImageMediaGalleryProps) {
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
          <div
            key={image.index}
            className="overflow-hidden rounded-2xl border border-white/8 bg-black/20"
          >
            <img
              src={image.previewPath}
              alt={`${platformLabel} image ${image.index + 1}`}
              loading="lazy"
              className="w-full aspect-square object-cover bg-zinc-900"
            />
            <a
              href={image.downloadPath}
              download={`${platformLabel.toLowerCase()}-${image.index + 1}.${image.extension}`}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-syne font-600 text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M12 16l-6-6h4V4h4v6h4l-6 6zm-7 2h14v2H5v-2z" />
              </svg>
              Download image {image.index + 1}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
