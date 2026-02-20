"use client";

import { BreakoutStatus } from "@/lib/analysis";

interface WallStatusProps {
  ticker: string;
  status: BreakoutStatus;
}

const STATUS_CONFIG = {
  "testing-floor": {
    label: "Price is testing a Major Floor",
    description:
      "The price is within 2% of the strongest support level from 5 years of data.",
    colors: "border-emerald-500/30 bg-emerald-500/10",
    textColor: "text-emerald-400",
    icon: "shield",
  },
  "testing-ceiling": {
    label: "Price is testing a Heavy Ceiling",
    description:
      "The price is within 2% of the strongest resistance level from 5 years of data.",
    colors: "border-amber-500/30 bg-amber-500/10",
    textColor: "text-amber-400",
    icon: "alert",
  },
  "between-levels": {
    label: "Trading between Major Levels",
    description:
      "The price is not near either Steel Wall. See the chart for the closest levels.",
    colors: "border-sky-500/30 bg-sky-500/10",
    textColor: "text-sky-400",
    icon: "none",
  },
  "no-walls": {
    label: "No Clear Walls Found",
    description:
      "We couldn't find strong price levels in the last 5 years of data.",
    colors: "border-slate-700 bg-slate-800/50",
    textColor: "text-slate-400",
    icon: "none",
  },
} as const;

function StatusIcon({ type }: { type: string }) {
  if (type === "rocket") {
    return <span className="text-5xl">🚀</span>;
  }
  if (type === "shield") {
    return (
      <svg className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }
  if (type === "alert") {
    return (
      <svg className="h-12 w-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  }
  return null;
}

export default function WallStatus({ ticker, status }: WallStatusProps) {
  const config = STATUS_CONFIG[status.status];

  return (
    <div className={`w-full max-w-2xl rounded-xl border p-6 ${config.colors}`}>
      <div className="flex items-center gap-4">
        <StatusIcon type={config.icon} />
        <div className="flex-1">
          <h2 className={`text-2xl font-bold ${config.textColor}`}>
            {ticker}
          </h2>
          <p className={`mt-1 text-lg font-semibold ${config.textColor}`}>
            {config.label}
          </p>
          <p className="mt-1 text-sm text-slate-400">{config.description}</p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Current Price" value={`$${status.currentPrice.toFixed(2)}`} />
        <Stat
          label="Today's Volume"
          value={formatVolume(status.currentVolume)}
        />
        <Stat label="Avg Volume (20d)" value={formatVolume(status.avgVolume20d)} />
        <Stat
          label="Volume Energy"
          value={`${status.volumeRatio}x`}
          highlight={status.volumeRatio >= 1.2}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-900/80 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${highlight ? "text-sky-400" : "text-slate-200"}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
}
