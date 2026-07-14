import { useCallback, useMemo, useState } from "react";

export function useProgressiveVisibleItems(items, contextKey, pageSize = 40) {
  const [state, setState] = useState({ contextKey, visibleCount: pageSize });
  const visibleCount = state.contextKey === contextKey ? state.visibleCount : pageSize;

  const visibleItems = useMemo(
    () => items.slice(0, Math.min(visibleCount, items.length)),
    [items, visibleCount],
  );
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  const showMore = useCallback(() => {
    setState((current) => {
      const currentVisibleCount = current.contextKey === contextKey ? current.visibleCount : pageSize;
      return {
        contextKey,
        visibleCount: Math.min(items.length, currentVisibleCount + pageSize),
      };
    });
  }, [contextKey, items.length, pageSize]);

  const revealIndex = useCallback((index) => {
    if (!Number.isFinite(index) || index < 0) return;
    setState((current) => {
      const currentVisibleCount = current.contextKey === contextKey ? current.visibleCount : pageSize;
      return {
        contextKey,
        visibleCount: Math.max(currentVisibleCount, Math.min(items.length, index + 1)),
      };
    });
  }, [contextKey, items.length, pageSize]);

  const setVisibleCount = useCallback((updater) => {
    setState((current) => {
      const currentVisibleCount = current.contextKey === contextKey ? current.visibleCount : pageSize;
      return {
        contextKey,
        visibleCount:
          typeof updater === "function" ? updater(currentVisibleCount) : updater,
      };
    });
  }, [contextKey, pageSize]);

  return {
    visibleCount,
    visibleItems,
    remainingCount,
    showMore,
    revealIndex,
    setVisibleCount,
  };
}
