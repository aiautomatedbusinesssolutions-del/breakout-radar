"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import WallStatus from "@/components/WallStatus";
import PriceChart from "@/components/PriceChart";
import HistoricalPerformance from "@/components/HistoricalPerformance";
import { Wall, BreakoutStatus, BounceStats } from "@/lib/analysis";

interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ScanResult {
  ticker: string;
  walls: Wall[];
  status: BreakoutStatus;
  chartPrices: ChartPoint[];
  bounceStats: BounceStats;
}

export default function Home() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(ticker: string) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch {
      setError("Could not connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 pb-16 pt-8">
      {/* Header + Search — always at the top per CLAUDE.md */}
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
            Breakout Radar
          </h1>
          <p className="mt-1 text-slate-400">
            Find where prices keep bouncing — potential floors and ceilings
          </p>
        </div>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-3 text-slate-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Scanning 5 years of price history...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full max-w-2xl rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-rose-400">
            {error}
          </div>
        )}

        {/* Results — Radar view only */}
        {result && (
          <div className="flex w-full flex-col items-center gap-6">
            {/* The 3-second visual — status card */}
            <WallStatus ticker={result.ticker} status={result.status} />

            {/* Price chart with Steel Wall lines */}
            {result.chartPrices.length > 0 && (
              <PriceChart
                data={result.chartPrices}
                walls={result.walls}
                currentPrice={result.status.currentPrice}
              />
            )}

            {/* Steel Walls — Two-Wall Rule: strongest floor + strongest ceiling */}
            {result.walls.length > 0 && (() => {
              const topFloor = result.walls.find((w) => w.type === "Floor");
              const topCeiling = result.walls.find((w) => w.type === "Ceiling");
              const twoWalls = [topFloor, topCeiling].filter(Boolean) as Wall[];
              return (
                <div className="w-full max-w-2xl">
                  <h3 className="mb-3 text-lg font-semibold text-slate-100">
                    Steel Walls
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      Strongest levels from 5 years of data
                    </span>
                  </h3>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {twoWalls.map((wall, i) => (
                      <WallCard
                        key={i}
                        wall={wall}
                        currentPrice={result.status.currentPrice}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Historical Performance — below Steel Walls */}
            <HistoricalPerformance stats={result.bounceStats} />
          </div>
        )}
      </div>
    </main>
  );
}

function WallCard({
  wall,
  currentPrice,
}: {
  wall: Wall;
  currentPrice: number;
}) {
  const isFloor = wall.type === "Floor";
  const typeColor = isFloor ? "text-emerald-400" : "text-amber-400";
  const typeBg = isFloor ? "bg-emerald-500/10" : "bg-amber-500/10";
  const label = isFloor ? "Price Floor" : "Heavy Ceiling";

  // Strength label based on number of touches
  const strengthLabel =
    wall.strength >= 7
      ? "Very Strong"
      : wall.strength >= 5
        ? "Strong"
        : "Moderate";

  const absDist = Math.abs(wall.distancePercent);
  const direction = wall.distancePercent >= 0 ? "above" : "below";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between">
        <div>
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${typeColor} ${typeBg}`}
          >
            {label}
          </span>
          <p className="mt-2 text-xl font-bold text-slate-100">
            ${wall.price.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Strength</p>
          <p className={`text-sm font-semibold ${typeColor}`}>
            {strengthLabel}
          </p>
          <p className="text-xs text-slate-500">
            {wall.strength} touches
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
        <p className="text-xs text-slate-500">Distance from current price</p>
        <p className="text-sm font-medium text-slate-300">
          {absDist.toFixed(2)}% {direction}
        </p>
      </div>
    </div>
  );
}
