// analysis.ts — Master calculations engine for Breakout Radar.
// Finds "Steel Walls" (price levels where a stock has bounced repeatedly),
// determines the breakout status, and extracts historical bounce data.
//
// All calculations run through a single `analyzeAll()` entry point so the
// expensive extrema-detection and clustering work happens exactly ONCE per
// API request — not three times like before.

import { DailyPrice } from "./tiingo";

// ---------------------------------------------------------------------------
// Configuration — single source of truth for every threshold in the app
// ---------------------------------------------------------------------------

/** How close two price points must be (as a fraction) to count as the same wall */
export const CLUSTER_THRESHOLD = 0.015; // 1.5%

/** Minimum number of touches for a bucket to qualify as a Steel Wall */
const MIN_TOUCHES = 3;

/** How many trading days ahead we look to measure the reaction after a bounce */
const REACTION_WINDOW = 20;

/** Price within this % of a Steel Wall is considered "testing" that level */
const TESTING_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Public interfaces — imported by UI components
// ---------------------------------------------------------------------------

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
  /** Distance to the nearest Steel Wall, rounded to 1 decimal (e.g. 3.2) */
  nearestWallPercent: number | null;
  /** Whether the nearest wall is a Floor or Ceiling */
  nearestWallType: "Floor" | "Ceiling" | null;
}

export interface Bounce {
  date: string;
  wallType: "Floor" | "Ceiling";
  movePercent: number;
}

export interface BounceStats {
  floorTouches: number;
  floorAvgMove: number;
  ceilingTouches: number;
  ceilingAvgMove: number;
  recentBounces: Bounce[];
}

/** Everything the API needs to return for a single ticker scan */
export interface AnalysisResult {
  walls: Wall[];
  status: BreakoutStatus;
  bounceStats: BounceStats;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface Extrema {
  price: number;
  kind: "high" | "low";
  date: string;
  index: number;
}

interface Bucket {
  extremas: Extrema[];
  average: number;
}

// ---------------------------------------------------------------------------
// Step 1 — Find local highs and lows ("extremas")
// We look at each day and check: was this day's high higher than its
// neighbors? If so, the price peaked here. Same idea for lows.
// ---------------------------------------------------------------------------

function findExtremas(prices: DailyPrice[], window: number = 5): Extrema[] {
  const extremas: Extrema[] = [];

  for (let i = window; i < prices.length - window; i++) {
    const currentHigh = prices[i].high;
    const currentLow = prices[i].low;

    let isLocalHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && prices[j].high >= currentHigh) {
        isLocalHigh = false;
        break;
      }
    }

    let isLocalLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j !== i && prices[j].low <= currentLow) {
        isLocalLow = false;
        break;
      }
    }

    if (isLocalHigh)
      extremas.push({ price: currentHigh, kind: "high", date: prices[i].date, index: i });
    if (isLocalLow)
      extremas.push({ price: currentLow, kind: "low", date: prices[i].date, index: i });
  }

  return extremas;
}

// ---------------------------------------------------------------------------
// Step 2 — Group nearby price points into buckets
// If two bounce points are within CLUSTER_THRESHOLD of each other, they
// probably represent the same "wall." We cluster them together.
// ---------------------------------------------------------------------------

function clusterIntoBuckets(extremas: Extrema[]): Bucket[] {
  const sorted = [...extremas].sort((a, b) => a.price - b.price);
  const buckets: Bucket[] = [];

  for (const point of sorted) {
    let placed = false;

    for (const bucket of buckets) {
      const distance = Math.abs(point.price - bucket.average) / bucket.average;
      if (distance <= CLUSTER_THRESHOLD) {
        bucket.extremas.push(point);
        bucket.average =
          bucket.extremas.reduce((sum, e) => sum + e.price, 0) /
          bucket.extremas.length;
        placed = true;
        break;
      }
    }

    if (!placed) {
      buckets.push({ extremas: [point], average: point.price });
    }
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// Step 3 — Average volume (20-day)
// ---------------------------------------------------------------------------

function calcAverageVolume20d(prices: DailyPrice[]): number {
  const recent = prices.slice(-20);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, day) => sum + day.volume, 0) / recent.length;
}

// ---------------------------------------------------------------------------
// Master function — analyzeAll()
//
// Runs the extrema → cluster pipeline ONCE, then derives:
//   1. Steel Walls (sorted by strength)
//   2. Breakout Status (testing-floor / testing-ceiling / between-levels)
//   3. Bounce Stats (touch counts + average reaction moves)
// ---------------------------------------------------------------------------

const EMPTY_RESULT: AnalysisResult = {
  walls: [],
  status: {
    currentPrice: 0,
    avgVolume20d: 0,
    currentVolume: 0,
    volumeRatio: 0,
    status: "no-walls",
    nearestWallPercent: null,
    nearestWallType: null,
  },
  bounceStats: {
    floorTouches: 0,
    floorAvgMove: 0,
    ceilingTouches: 0,
    ceilingAvgMove: 0,
    recentBounces: [],
  },
};

export function analyzeAll(prices: DailyPrice[]): AnalysisResult {
  if (prices.length === 0) return EMPTY_RESULT;

  const currentPrice = prices[prices.length - 1].close;
  const currentVolume = prices[prices.length - 1].volume;

  // ---- Single pass: extremas + clustering ----
  const extremas = findExtremas(prices);
  const buckets = clusterIntoBuckets(extremas);

  // ---- Derive walls ----
  const walls: Wall[] = buckets
    .filter((b) => b.extremas.length >= MIN_TOUCHES)
    .map((b) => {
      const avg = Math.round(b.average * 100) / 100;
      return {
        price: avg,
        strength: b.extremas.length,
        type: avg >= currentPrice ? ("Ceiling" as const) : ("Floor" as const),
        distancePercent:
          Math.round(((avg - currentPrice) / currentPrice) * 10000) / 100,
      };
    })
    .sort((a, b) => b.strength - a.strength);

  // ---- Derive breakout status ----
  const avgVolume20d = calcAverageVolume20d(prices);
  const volumeRatio = avgVolume20d > 0 ? currentVolume / avgVolume20d : 0;

  const strongestFloor = walls.find((w) => w.type === "Floor");
  const strongestCeiling = walls.find((w) => w.type === "Ceiling");

  const floorDist = strongestFloor
    ? Math.abs(strongestFloor.distancePercent)
    : Infinity;
  const ceilingDist = strongestCeiling
    ? Math.abs(strongestCeiling.distancePercent)
    : Infinity;

  let statusLabel: BreakoutStatus["status"];
  if (walls.length === 0) {
    statusLabel = "no-walls";
  } else if (floorDist <= TESTING_THRESHOLD) {
    statusLabel = "testing-floor";
  } else if (ceilingDist <= TESTING_THRESHOLD) {
    statusLabel = "testing-ceiling";
  } else {
    statusLabel = "between-levels";
  }

  // ---- Nearest wall proximity (for "between-levels" display) ----
  let nearestWallPercent: number | null = null;
  let nearestWallType: "Floor" | "Ceiling" | null = null;

  if (strongestFloor || strongestCeiling) {
    if (floorDist <= ceilingDist && strongestFloor) {
      nearestWallPercent = Math.round(floorDist * 10) / 10;
      nearestWallType = "Floor";
    } else if (strongestCeiling) {
      nearestWallPercent = Math.round(ceilingDist * 10) / 10;
      nearestWallType = "Ceiling";
    }
  }

  const status: BreakoutStatus = {
    currentPrice,
    avgVolume20d: Math.round(avgVolume20d),
    currentVolume,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    status: statusLabel,
    nearestWallPercent,
    nearestWallType,
  };

  // ---- Derive bounce stats ----
  // Uses the SAME buckets computed above — guaranteed identical touch counts
  const wallBuckets = buckets
    .filter((b) => b.extremas.length >= MIN_TOUCHES)
    .sort((a, b) => b.extremas.length - a.extremas.length);

  const floorBucket = wallBuckets.find(
    (b) => Math.round(b.average * 100) / 100 < currentPrice
  );
  const ceilingBucket = wallBuckets.find(
    (b) => Math.round(b.average * 100) / 100 >= currentPrice
  );

  const floorBounces = extractBounces(floorBucket, "Floor", prices);
  const ceilingBounces = extractBounces(ceilingBucket, "Ceiling", prices);
  const allBounces = [...floorBounces, ...ceilingBounces].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const bounceStats: BounceStats = {
    floorTouches: floorBounces.length,
    floorAvgMove:
      floorBounces.length > 0
        ? Math.round(
            (floorBounces.reduce((s, b) => s + b.movePercent, 0) /
              floorBounces.length) *
              100
          ) / 100
        : 0,
    ceilingTouches: ceilingBounces.length,
    ceilingAvgMove:
      ceilingBounces.length > 0
        ? Math.round(
            (ceilingBounces.reduce((s, b) => s + b.movePercent, 0) /
              ceilingBounces.length) *
              100
          ) / 100
        : 0,
    recentBounces: allBounces.slice(-10),
  };

  return { walls, status, bounceStats };
}

// ---------------------------------------------------------------------------
// Helper — extract bounce reactions from a wall bucket
// ---------------------------------------------------------------------------

function extractBounces(
  bucket: Bucket | undefined,
  wallType: "Floor" | "Ceiling",
  prices: DailyPrice[]
): Bounce[] {
  if (!bucket) return [];

  return bucket.extremas
    .sort((a, b) => a.index - b.index)
    .map((ext) => {
      let movePercent = 0;

      if (wallType === "Floor") {
        let maxHigh = ext.price;
        const end = Math.min(ext.index + REACTION_WINDOW, prices.length - 1);
        for (let j = ext.index + 1; j <= end; j++) {
          if (prices[j].high > maxHigh) maxHigh = prices[j].high;
        }
        movePercent = ((maxHigh - ext.price) / ext.price) * 100;
      } else {
        let minLow = ext.price;
        const end = Math.min(ext.index + REACTION_WINDOW, prices.length - 1);
        for (let j = ext.index + 1; j <= end; j++) {
          if (prices[j].low < minLow) minLow = prices[j].low;
        }
        movePercent = ((ext.price - minLow) / ext.price) * 100;
      }

      return {
        date: ext.date,
        wallType,
        movePercent: Math.round(movePercent * 100) / 100,
      };
    });
}
