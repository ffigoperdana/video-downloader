import Link from "next/link";
import { ReactNode } from "react";
import Navbar from "./navbar";

interface DownloaderShellProps {
  children: ReactNode;
  accentClass: string;
  glowClass: string;
  borderGlow: string;
  batchSlot?: ReactNode;
}

export default function DownloaderShell({
  children,
  accentClass,
  glowClass,
  borderGlow,
  batchSlot,
}: DownloaderShellProps) {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Navbar />

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] ${glowClass} blur-[140px] rounded-full`}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <main className="relative z-10 pt-24 pb-24 px-4">
        <div className="max-w-2xl mx-auto space-y-6">{children}</div>
      </main>

      {batchSlot}
    </div>
  );
}
