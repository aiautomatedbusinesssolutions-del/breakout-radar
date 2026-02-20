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

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Tiingo] Network error: ${msg.slice(0, 80)}`);
    throw new Error(`Network error while fetching data for "${ticker}".`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[Tiingo] HTTP ${res.status} ${res.statusText} — ${body.slice(0, 80)}`
    );
    throw new Error(
      `Failed to fetch data for "${ticker}": ${res.status} ${res.statusText}`
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
    throw new Error(`No historical data found for "${ticker}".`);
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
