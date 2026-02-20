// analysis.ts — Finds "Price Walls": levels where a stock's price
// has bounced multiple times, like a ball hitting a floor or ceiling.
// Also checks if a breakout is real or just a fake-out using volume.

import { DailyPrice } from "./tiingo";

export interface Wall {
  /** The average price level of this wall */
  price: number;
  /** How many times the price touched this level (more hits = stronger wall) */
  strength: number;
  /** "Floor" if the wall is below the current price, "Ceiling" if above */
  type: "Floor" | "Ceiling";
  /** How far the current price is from this wall, as a percentage */
  distancePercent: number;
}

export interface BreakoutStatus {
  currentPrice: number;
  avgVolume20d: number;
  currentVolume: number;
  /** How much higher (or lower) today's volume is vs the 20-day average */
  volumeRatio: number;
  status:
    | "testing-floor"
    | "testing-ceiling"
    | "between-levels"
    | "no-walls";
}

// ---------------------------------------------------------------------------
// Step 1 — Find local highs and lows ("extremas")
// We look at each day and check: was this day's high higher than its
// neighbors? If so, the price peaked here. Same idea for lows.
// ---------------------------------------------------------------------------

interface Extrema {
  price: number;
  kind: "high" | "low";
}

function findExtremas(prices: DailyPrice[], window: number = 5): Extrema[] {
  const extremas: Extrema[] = [];

  for (let i = window; i < prices.length - window; i++) {
    const currentHigh = prices[i].high;
    const currentLow = prices[i].low;

    // Check if this day's high is the highest in the surrounding window
    let isLocalHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && prices[j].high >= currentHigh) {
        isLocalHigh = false;
        break;
      }
    }

    // Check if this day's low is the lowest in the surrounding window
    let isLocalLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && prices[j].low <= currentLow) {
        isLocalLow = false;
        break;
      }
    }

    if (isLocalHigh) extremas.push({ price: currentHigh, kind: "high" });
    if (isLocalLow) extremas.push({ price: currentLow, kind: "low" });
  }

  return extremas;
}

// ---------------------------------------------------------------------------
// Step 2 — Group nearby price points into buckets
// If two bounce points are within 1.5% of each other, they probably
// represent the same "wall." We cluster them together.
// ---------------------------------------------------------------------------

interface Bucket {
  prices: number[];
  average: number;
}

function clusterIntoBuckets(extremas: Extrema[]): Bucket[] {
  const sorted = [...extremas].sort((a, b) => a.price - b.price);
  const buckets: Bucket[] = [];

  for (const point of sorted) {
    let placed = false;

    for (const bucket of buckets) {
      const distance = Math.abs(point.price - bucket.average) / bucket.average;
      if (distance <= 0.015) {
        bucket.prices.push(point.price);
        bucket.average =
          bucket.prices.reduce((sum, p) => sum + p, 0) / bucket.prices.length;
        placed = true;
        break;
      }
    }

    if (!placed) {
      buckets.push({ prices: [point.price], average: point.price });
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Step 3 — Pick the strong walls (3+ touches) and label them
// ---------------------------------------------------------------------------

const MIN_TOUCHES = 3;

/**
 * Analyzes historical prices to find "Price Walls" — levels where
 * the stock has repeatedly bounced. Think of them as invisible
 * floors and ceilings that the price struggles to break through.
 */
export function findWalls(prices: DailyPrice[]): Wall[] {
  if (prices.length === 0) return [];

  const currentPrice = prices[prices.length - 1].close;

  const extremas = findExtremas(prices);
  const buckets = clusterIntoBuckets(extremas);

  const walls: Wall[] = buckets
    .filter((bucket) => bucket.prices.length >= MIN_TOUCHES)
    .map((bucket) => {
      const avg = Math.round(bucket.average * 100) / 100;
      return {
        price: avg,
        strength: bucket.prices.length,
        type: avg >= currentPrice ? "Ceiling" : "Floor",
        distancePercent:
          Math.round(((avg - currentPrice) / currentPrice) * 10000) / 100,
      };
    });

  walls.sort((a, b) => b.strength - a.strength);

  return walls;
}

// ---------------------------------------------------------------------------
// Step 4 — Volume check (Anti-Fake-out)
// A price moving past a wall doesn't mean much if nobody's trading.
// We compare today's volume to the 20-day average. If volume is 20%+
// above average, the move is probably real. Otherwise it's a "weak move."
// ---------------------------------------------------------------------------

/**
 * Calculates the average daily trading volume over the last 20 days.
 * Think of it as "how busy is this stock normally?"
 */
export function calcAverageVolume20d(prices: DailyPrice[]): number {
  const recent = prices.slice(-20);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, day) => sum + day.volume, 0) / recent.length;
}

// Price within 2% of a Steel Wall is considered "testing" that level
const TESTING_THRESHOLD = 2.0;

/**
 * Determines the overall breakout status using the Two-Wall Rule:
 * only the single strongest Floor and single strongest Ceiling
 * (the same levels drawn on the chart) drive the status message.
 */
export function getBreakoutStatus(prices: DailyPrice[]): BreakoutStatus {
  if (prices.length === 0) {
    return {
      currentPrice: 0,
      avgVolume20d: 0,
      currentVolume: 0,
      volumeRatio: 0,
      status: "no-walls",
    };
  }

  const currentPrice = prices[prices.length - 1].close;
  const currentVolume = prices[prices.length - 1].volume;
  const avgVolume20d = calcAverageVolume20d(prices);
  const volumeRatio = avgVolume20d > 0 ? currentVolume / avgVolume20d : 0;

  const walls = findWalls(prices);

  if (walls.length === 0) {
    return {
      currentPrice,
      avgVolume20d: Math.round(avgVolume20d),
      currentVolume,
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      status: "no-walls",
    };
  }

  // Two-Wall Rule: strongest Floor below price, strongest Ceiling above
  const strongestFloor = walls.find((w) => w.type === "Floor");
  const strongestCeiling = walls.find((w) => w.type === "Ceiling");

  const floorDist = strongestFloor
    ? Math.abs(strongestFloor.distancePercent)
    : Infinity;
  const ceilingDist = strongestCeiling
    ? Math.abs(strongestCeiling.distancePercent)
    : Infinity;

  let status: BreakoutStatus["status"];

  if (floorDist <= TESTING_THRESHOLD) {
    status = "testing-floor";
  } else if (ceilingDist <= TESTING_THRESHOLD) {
    status = "testing-ceiling";
  } else {
    status = "between-levels";
  }

  return {
    currentPrice,
    avgVolume20d: Math.round(avgVolume20d),
    currentVolume,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    status,
  };
}
