// tiingo.ts — Fetches historical stock price data from Tiingo

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TiingoPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjOpen: number;
  adjHigh: number;
  adjLow: number;
  adjClose: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
}

/** Request timeout — 10 seconds */
const FETCH_TIMEOUT_MS = 10_000;

/** 5 years ago from today, as YYYY-MM-DD */
function getFiveYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().slice(0, 10);
}

/**
 * Grabs 5 years of daily price history for a stock ticker from Tiingo.
 * Uses adjusted high/low prices so the breakout analysis accounts
 * for splits and dividends automatically.
 */
export async function fetchHistoricalPrices(
  ticker: string
): Promise<DailyPrice[]> {
  const apiKey = process.env.TIINGO_API_KEY;

  if (!apiKey) {
    throw new Error("TIINGO_API_KEY is not set.");
  }

  const symbol = encodeURIComponent(ticker.toUpperCase());
  const startDate = getFiveYearsAgo();

  const url =
    `https://api.tiingo.com/tiingo/daily/${symbol}/prices` +
    `?startDate=${startDate}`;

  console.log(`[Tiingo] Fetching ${symbol} from ${startDate}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        `Request timed out while fetching data for "${ticker}". Please try again.`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Tiingo] Network error: ${msg.slice(0, 80)}`);
    throw new Error(`Network error while fetching data for "${ticker}".`);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) {
    throw new Error(
      `Could not find ticker "${ticker.toUpperCase()}". Please check the symbol and try again.`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[Tiingo] HTTP ${res.status} ${res.statusText} — ${body.slice(0, 80)}`
    );
    throw new Error(
      `Data unavailable for "${ticker}": ${res.status} ${res.statusText}`
    );
  }

  let data: TiingoPrice[];
  try {
    data = await res.json();
  } catch {
    console.error("[Tiingo] Response was not valid JSON");
    throw new Error(`Invalid response from Tiingo for "${ticker}".`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error("[Tiingo] Empty or invalid response");
    throw new Error(
      `No historical data found for "${ticker.toUpperCase()}". It may be delisted or too new.`
    );
  }

  console.log(`[Tiingo] Received ${data.length} daily bars for ${symbol}`);

  // Map to DailyPrice using adjusted high/low for split/dividend accuracy
  return data.map((day) => ({
    date: day.date.slice(0, 10),
    open: day.adjOpen,
    high: day.adjHigh,
    low: day.adjLow,
    close: day.adjClose,
    volume: day.adjVolume,
  }));
}
