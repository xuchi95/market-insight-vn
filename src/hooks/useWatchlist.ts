import { useState, useEffect, useCallback } from "react";

export interface WatchItem {
  symbol: string;
  label: string;
  category: string;
  to: string;
}

const STORAGE_KEY = "mw_watchlist";

export function useWatchlist() {
  const [list, setList] = useState<WatchItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setList(JSON.parse(raw));
    } catch {}
  }, []);

  const isWatched = useCallback(
    (symbol: string) => list.some((i) => i.symbol.toLowerCase() === symbol.toLowerCase()),
    [list],
  );

  const toggle = useCallback((item: WatchItem) => {
    setList((prev) => {
      const exists = prev.some((i) => i.symbol.toLowerCase() === item.symbol.toLowerCase());
      const next = exists
        ? prev.filter((i) => i.symbol.toLowerCase() !== item.symbol.toLowerCase())
        : [...prev, item];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    setList((prev) => {
      const next = prev.filter((i) => i.symbol.toLowerCase() !== symbol.toLowerCase());
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { list, isWatched, toggle, remove };
}
