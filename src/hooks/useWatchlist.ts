import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface WatchItem {
  symbol: string;
  label: string;
  category: string;
  to: string;
}

const STORAGE_KEY = "mw_watchlist";

function readLocal(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WatchItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(list: WatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function useWatchlist() {
  const { user } = useAuth();
  const [list, setList] = useState<WatchItem[]>([]);
  const mergedRef = useRef<string | null>(null);

  useEffect(() => {
    // Anonymous: read from localStorage
    if (!user) {
      setList(readLocal());
      mergedRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("watchlist_items")
        .select("symbol,label,category,to_path")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const remote: WatchItem[] = (data ?? []).map((r) => ({
        symbol: r.symbol,
        label: r.label,
        category: r.category,
        to: r.to_path,
      }));

      // One-time merge of local items into cloud on sign-in
      if (mergedRef.current !== user.id) {
        mergedRef.current = user.id;
        const local = readLocal();
        const missing = local.filter(
          (l) => !remote.some((r) => r.symbol.toLowerCase() === l.symbol.toLowerCase()),
        );
        if (missing.length > 0) {
          await supabase.from("watchlist_items").insert(
            missing.map((m) => ({
              user_id: user.id,
              symbol: m.symbol,
              label: m.label,
              category: m.category,
              to_path: m.to,
            })),
          );
          remote.push(...missing);
          writeLocal([]);
        }
      }
      setList(remote);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isWatched = useCallback(
    (symbol: string) => list.some((i) => i.symbol.toLowerCase() === symbol.toLowerCase()),
    [list],
  );

  const toggle = useCallback(
    (item: WatchItem) => {
      setList((prev) => {
        const exists = prev.some(
          (i) => i.symbol.toLowerCase() === item.symbol.toLowerCase(),
        );
        const next = exists
          ? prev.filter((i) => i.symbol.toLowerCase() !== item.symbol.toLowerCase())
          : [...prev, item];
        if (user) {
          if (exists) {
            void supabase
              .from("watchlist_items")
              .delete()
              .eq("user_id", user.id)
              .eq("symbol", item.symbol);
          } else {
            void supabase.from("watchlist_items").insert({
              user_id: user.id,
              symbol: item.symbol,
              label: item.label,
              category: item.category,
              to_path: item.to,
            });
          }
        } else {
          writeLocal(next);
        }
        return next;
      });
    },
    [user],
  );

  const remove = useCallback(
    (symbol: string) => {
      setList((prev) => {
        const next = prev.filter(
          (i) => i.symbol.toLowerCase() !== symbol.toLowerCase(),
        );
        if (user) {
          void supabase
            .from("watchlist_items")
            .delete()
            .eq("user_id", user.id)
            .eq("symbol", symbol);
        } else {
          writeLocal(next);
        }
        return next;
      });
    },
    [user],
  );

  return { list, isWatched, toggle, remove, synced: !!user };
}
