"use client";

// Part 23: "Load more" — show a list 24 cards at a time.
// All rows are still fetched once (they are small: titles, modules, file
// paths — the PDFs themselves only download on View), so the filters, the
// module dropdown, the Solved counts and the module grouping keep working on
// the whole list. Only the number of cards drawn is limited.
//
//   const page = useLoadMore(filtered, `${year}|${semester}|${module}`);
//   page.shown      → the first 24 / 48 / … items to draw
//   page.remaining  → how many are still hidden
//   page.loadMore() → show 24 more
//
// resetKey: when it changes (a filter changed), the list starts again at 24.

import { useState } from "react";

export const PAGE_SIZE = 24;

export function useLoadMore<T>(items: T[], resetKey: string, pageSize = PAGE_SIZE) {
  const [count, setCount] = useState(pageSize);
  const [lastKey, setLastKey] = useState(resetKey);

  // A filter changed: back to the first 24. (Setting state while rendering is
  // React's documented way to reset state when a value changes, without an
  // extra useEffect render.)
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setCount(pageSize);
  }

  return {
    shown: items.slice(0, count),
    remaining: Math.max(items.length - count, 0),
    loadMore: () => setCount((current) => current + pageSize),
  };
}
