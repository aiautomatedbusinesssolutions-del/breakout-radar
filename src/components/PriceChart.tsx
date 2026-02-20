"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  ColorType,
  LineStyle,
  type IChartApi,
} from "lightweight-charts";
import { Wall } from "@/lib/analysis";

interface CandlePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PriceChartProps {
  data: CandlePoint[];
  walls: Wall[];
  currentPrice: number;
}

export default function PriceChart({
  data,
  walls,
  currentPrice,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#94a3b8",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      width: containerRef.current.clientWidth,
      height: 380,
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: { top: 0.04, bottom: 0.04 },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: false,
        barSpacing: 8,
        minBarSpacing: 4,
        rightOffset: 0,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      crosshair: {
        vertLine: { color: "#475569", labelBackgroundColor: "#334155" },
        horzLine: { color: "#475569", labelBackgroundColor: "#334155" },
      },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      // Disable the auto "last value" line so it doesn't
      // create a confusing third dashed line near the floor/ceiling
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const candleData = data.map((d) => ({
      time: d.date as string,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    series.setData(candleData);

    // ---- Two-Wall Rule ----
    // Walls arrive sorted by strength (strongest first).
    // Pick the single strongest Floor below price and single strongest Ceiling above.
    // Rendered as independent LineSeries — no dependency on the candle series.
    const strongestFloor = walls.find((w) => w.type === "Floor");
    const strongestCeiling = walls.find((w) => w.type === "Ceiling");

    const firstDate = data[0].date;
    const lastDate = data[data.length - 1].date;

    // Floor — constant GREEN #22c55e, dashed
    if (strongestFloor) {
      const floorLine = chart.addSeries(LineSeries, {
        color: "#22c55e",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceLineVisible: false,
        title: `MAJOR FLOOR (${strongestFloor.strength}x)`,
      });
      floorLine.setData([
        { time: firstDate, value: strongestFloor.price },
        { time: lastDate, value: strongestFloor.price },
      ]);
    }

    // Ceiling — constant RED #ef4444, dashed
    if (strongestCeiling) {
      const ceilingLine = chart.addSeries(LineSeries, {
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceLineVisible: false,
        title: `MAJOR CEILING (${strongestCeiling.strength}x)`,
      });
      ceilingLine.setData([
        { time: firstDate, value: strongestCeiling.price },
        { time: lastDate, value: strongestCeiling.price },
      ]);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, walls, currentPrice]);

  if (data.length === 0) return null;

  return (
    <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">
        Price Radar
        <span className="ml-2 text-sm font-normal text-slate-500">
          6 months — Walls from 5 years of data
        </span>
      </h3>

      <div ref={containerRef} className="rounded-lg overflow-hidden" />

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm bg-green-500" style={{ width: 8, height: 14 }} />
          Price Up
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block rounded-sm bg-red-500" style={{ width: 8, height: 14 }} />
          Price Down
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-green-500" />
          Price Floor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-red-500" />
          Heavy Ceiling
        </span>
      </div>
    </div>
  );
}
