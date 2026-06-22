"use client";
import ProgressBar from "@/components/ui/progress-bar";
import type { BatchItem } from "@/core/hooks/use-batch-download";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-zinc-500",
  downloading: "text-white",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "○",
  downloading: "↓",
  completed: "✓",
  failed: "✕",
};

interface BatchProgressProps {
  items: BatchItem[];
  active: boolean;
  minimized: boolean;
  onToggleMinimize: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
  onClearCompleted: () => void;
  completed: number;
  failed: number;
  total: number;
}

export default function BatchProgress({
  items,
  active,
  minimized,
  onToggleMinimize,
  onCancel,
  onRetryFailed,
  onClearCompleted,
  completed,
  failed,
  total,
}: BatchProgressProps) {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="max-w-2xl mx-auto glass rounded-2xl border border-white/8 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <button
          onClick={onToggleMinimize}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-syne font-600 text-white">
              Batch Download
            </span>
            <span className="text-xs text-zinc-500">
              {completed}/{total} completed
              {failed > 0 && (
                <span className="text-red-400"> · {failed} failed</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {active && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
                className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                Cancel All
              </button>
            )}
            {!active && failed > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryFailed();
                }}
                className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
              >
                Retry Failed
              </button>
            )}
            {!active && completed > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearCompleted();
                }}
                className="px-3 py-1 rounded-lg bg-white/5 text-zinc-500 text-xs font-medium hover:bg-white/8 transition-colors"
              >
                Clear Done
              </button>
            )}
            <svg
              viewBox="0 0 24 24"
              className={`w-4 h-4 text-zinc-500 transition-transform ${minimized ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 15l-6-6-6 6" />
            </svg>
          </div>
        </button>

        {/* Items */}
        {!minimized && (
          <div className="max-h-60 overflow-y-auto border-t border-white/5">
            {items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-2.5 border-b border-white/3 last:border-0 flex items-center gap-3"
              >
                <span
                  className={`text-xs w-4 text-center flex-shrink-0 ${STATUS_COLORS[item.status]}`}
                >
                  {STATUS_ICONS[item.status]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white line-clamp-1">
                    {item.title}
                  </p>
                  {item.status === "downloading" && (
                    <div className="mt-1">
                      <ProgressBar
                        value={item.progress}
                        accentClass="from-indigo-500 to-violet-600"
                      />
                    </div>
                  )}
                  {item.status === "failed" && item.error && (
                    <p className="text-[10px] text-red-400/70 mt-0.5">
                      {item.error}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 flex-shrink-0 w-8 text-right">
                  {item.status === "downloading"
                    ? `${item.progress}%`
                    : item.status === "completed"
                      ? "✓"
                      : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Overall progress bar */}
        {active && (
          <div className="px-4 pb-3">
            <ProgressBar
              value={completed}
              max={total}
              accentClass="from-emerald-500 to-emerald-400"
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}
