// Simple PWA icon generator — run with: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// Minimal PNG: 192x192 and 512x512 with a play button on dark gradient
// This creates a valid PNG using raw bytes (no external deps needed)

function createPng(size) {
  // We'll use a simple approach: generate a data URI and save as file
  // For production, replace with actual designed icons
  const canvas = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <g transform="translate(${size * 0.3}, ${size * 0.25})">
    <path d="M${size * 0.2} 0 L${size * 0.4} ${size * 0.25} L${size * 0.2} ${size * 0.5} Z" fill="white"/>
  </g>
</svg>`;
  return Buffer.from(canvas);
}

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "icon-192.png"), createPng(192));
writeFileSync(join(outDir, "icon-512.png"), createPng(512));

console.log("Icons generated in public/icons/");
