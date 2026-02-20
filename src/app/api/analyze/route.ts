import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalPrices } from "@/lib/tiingo";
import { findWalls, getBreakoutStatus, findBounces } from "@/lib/analysis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let ticker: string | undefined;
  try {
    const body = await req.json();
    ticker = body.ticker?.trim();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
  console.log("[API] /api/analyze hit — ticker:", ticker);

  if (!ticker) {
    return NextResponse.json(
      { error: "Please enter a stock ticker." },
      { status: 400 }
    );
  }

  try {
    const prices = await fetchHistoricalPrices(ticker);
    console.log(`[API] Got ${prices.length} prices for ${ticker}`);

    const walls = findWalls(prices);
    const status = getBreakoutStatus(prices);
    const bounceStats = findBounces(prices);

    // Send last ~6 months of OHLC for the chart (~130 trading days)
    // Walls are already calculated from the full 5-year dataset above
    const chartPrices = prices.slice(-130).map((p) => ({
      date: p.date,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));

    console.log(`[API] Found ${walls.length} walls, status: ${status.status}`);
    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      walls,
      status,
      chartPrices,
      bounceStats,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    console.error("[API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
