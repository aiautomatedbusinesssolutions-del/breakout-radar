"use client";

import { useState } from "react";

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSearch(trimmed.toUpperCase());
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search any stock ticker (e.g. AAPL, TSLA)"
          disabled={isLoading}
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-4 pl-12 pr-28 text-lg text-slate-100 placeholder-slate-500 outline-none transition-colors focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600"
        >
          {isLoading ? "Scanning..." : "Scan"}
        </button>
      </div>
    </form>
  );
}
