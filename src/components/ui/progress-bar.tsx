interface ProgressBarProps {
  value: number;
  max?: number;
  accentClass?: string;
  animated?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({
  value,
  max = 100,
  accentClass = "from-indigo-500 to-violet-600",
  animated = true,
  size = "sm",
}: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const h = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className={`w-full ${h} rounded-full bg-white/6 overflow-hidden`}>
      <div
        className={`${h} rounded-full bg-gradient-to-r ${accentClass} transition-all duration-300 relative overflow-hidden`}
        style={{ width: `${pct}%` }}
      >
        {animated && pct < 100 && (
          <div className="absolute inset-0 animate-shimmer" />
        )}
      </div>
    </div>
  );
}
