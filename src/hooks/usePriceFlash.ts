import { useEffect, useRef, useState } from "react";

/**
 * Returns a className that flashes green/red whenever `value` changes.
 */
export function usePriceFlash(value: number) {
  const prev = useRef(value);
  const [cls, setCls] = useState("");
  useEffect(() => {
    if (value === prev.current) return;
    const up = value > prev.current;
    setCls(up ? "flash-up" : "flash-down");
    prev.current = value;
    const id = setTimeout(() => setCls(""), 1000);
    return () => clearTimeout(id);
  }, [value]);
  return cls;
}