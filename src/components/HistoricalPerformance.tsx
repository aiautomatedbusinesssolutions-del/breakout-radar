"use client";

import { BounceStats } from "@/lib/analysis";

interface HistoricalPerformanceProps {
  stats: BounceStats;
}

export default function HistoricalPerformance({
  stats,
}: HistoricalPerformanceProps) {
  const hasBounces =
    stats.floorTouches > 0 ||
    stats.ceilingTouches > 0;

  if (!hasBounces) return null;

  return (
    <div className="w-full max-w-2xl">
      <h3 className="mb-3 text-lg font-semibold text-slate-100">
        Historical Performance
        <span className="ml-2 text-sm font-normal text-slate-500">
          Precision bounces from 5 years of data
        </span>
      </h3>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.floorTouches > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-emerald-400">
              Floor Support
            </p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {stats.floorTouches}
                </p>
                <p className="text-xs text-slate-500">
                  Precision touches (0.5%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-400">
                  +{stats.floorAvgMove}%
                </p>
                <p className="text-xs text-slate-500">Avg move up</p>
              </div>
            </div>
          </div>
        )}

        {stats.ceilingTouches > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-semibold text-rose-400">
              Ceiling Resistance
            </p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {stats.ceilingTouches}
                </p>
                <p className="text-xs text-slate-500">
                  Precision touches (0.5%)
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-rose-400">
                  -{stats.ceilingAvgMove}%
                </p>
                <p className="text-xs text-slate-500">Avg move down</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Bounces Table */}
      {stats.recentBounces.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">
                  Wall Type
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500">
                  Move After Touch
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentBounces
                .slice()
                .reverse()
                .map((bounce, i) => {
                  const isFloor = bounce.wallType === "Floor";
                  return (
                    <tr
                      key={i}
                      className="border-b border-slate-800/50 last:border-0"
                    >
                      <td className="px-4 py-2 text-slate-300">
                        {formatDate(bounce.date)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            isFloor ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {isFloor ? "Floor" : "Ceiling"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-medium ${
                          isFloor ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isFloor ? "+" : "-"}
                        {bounce.movePercent}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
