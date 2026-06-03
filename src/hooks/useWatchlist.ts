import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState<boolean>(false);
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
      setLoading(true);
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
          const { error: mergeErr } = await supabase.from("watchlist_items").insert(
            missing.map((m) => ({
              user_id: user.id,
              symbol: m.symbol,
              label: m.label,
              category: m.category,
              to_path: m.to,
            })),
          );
          if (!mergeErr) {
            remote.push(...missing);
            writeLocal([]);
          }
        }
      }
      setList(remote);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isWatched = useCallback(
    (symbol: string) => list.some((i) => i.symbol.toLowerCase() === symbol.toLowerCase()),
    [list],
  );

  const add = useCallback(
    async (item: WatchItem) => {
      const exists = list.some(
        (i) => i.symbol.toLowerCase() === item.symbol.toLowerCase(),
      );
      if (exists) return;
      const next = [...list, item];
      setList(next);
      if (user) {
        const { error } = await supabase.from("watchlist_items").insert({
          user_id: user.id,
          symbol: item.symbol,
          label: item.label,
          category: item.category,
          to_path: item.to,
        });
        if (error) {
          setList((prev) => prev.filter((i) => i.symbol !== item.symbol));
          toast.error("Không thể lưu vào danh sách theo dõi", { description: error.message });
        }
      } else {
        writeLocal(next);
      }
    },
    [list, user],
  );

  const remove = useCallback(
    async (symbol: string) => {
      const prev = list;
      const next = prev.filter(
        (i) => i.symbol.toLowerCase() !== symbol.toLowerCase(),
      );
      setList(next);
      if (user) {
        const { error } = await supabase
          .from("watchlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("symbol", symbol);
        if (error) {
          setList(prev);
          toast.error("Không thể xoá", { description: error.message });
        }
      } else {
        writeLocal(next);
      }
    },
    [list, user],
  );

  const toggle = useCallback(
    async (item: WatchItem) => {
      const exists = list.some(
        (i) => i.symbol.toLowerCase() === item.symbol.toLowerCase(),
      );
      if (exists) await remove(item.symbol);
      else await add(item);
    },
    [list, add, remove],
  );

  return { list, isWatched, add, toggle, remove, loading, synced: !!user };
}
