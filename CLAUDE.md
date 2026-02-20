# CLAUDE.md - Breakout Radar Rules

## Project Vision
Part of a 30-tool finance hub for beginners. Focus on high-impact visuals and 'Aha!' moments.

## Design System (Strict)
- **Theme:** Always `bg-slate-950` (Deep Dark Mode).
- **Cards:** `bg-slate-900` with `border border-slate-800`.
- **Typography:** Headings: `text-slate-100`, Subtext: `text-slate-400`.
- **The Traffic Light Palette:**
  - Success/Buy: `text-emerald-400` / `bg-emerald-500/10`
  - Warning/Wait: `text-amber-400` / `bg-amber-500/10`
  - Danger/Sell: `text-rose-400` / `bg-rose-500/10`
  - Neutral/Info: `text-sky-400` / `bg-sky-500/10`

## Communication Tone (Beginner-First)
- **The Friend Test:** Zero jargon. (e.g., use 'Price Floor' instead of 'Support', 'Energy' instead of 'Volatility').
- **Compliance:** Use probabilistic language ('Potential', 'Historically')—never promise profits.

## Component Rules
- **Mobile-First:** Large touch targets and high readability.
- **Navigation:** Search bar for stock tickers must always be at the top.
- **Visual Hook:** Every search must trigger a '3-second visual' (Gauge, Meter, or Light).

## Code Standards
- Use Next.js 15 App Router and Functional Components.
- Keep logic in `src/lib` and UI in `src/components`.
