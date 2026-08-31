"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PULL_THRESHOLD, REFRESH_SLOT, resistedPull } from "@/lib/boardRefresh";

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function atTop(): boolean {
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 1;
}

export function usePullToRefresh(refresh: () => Promise<void>) {
  const [pull, setPull] = useState(0);
  const [armed, setArmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const rawRef = useRef(0);
  const draggingRef = useRef(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const refreshingRef = useRef(false);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const applyPull = (next: number) => {
    pullRef.current = next;
    setPull(next);
    setArmed(next >= PULL_THRESHOLD);
  };

  const runRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setArmed(false);
    setDragging(false);
    draggingRef.current = false;
    applyPull(REFRESH_SLOT);
    try {
      await refreshRef.current();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      rawRef.current = 0;
      applyPull(0);
    }
  }, []);

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || !atTop()) return;
      const touch = event.touches[0];
      if (!touch) return;
      draggingRef.current = true;
      setDragging(true);
      startY.current = touch.clientY;
      startX.current = touch.clientX;
      rawRef.current = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!draggingRef.current || refreshingRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      const dy = touch.clientY - startY.current;
      const dx = touch.clientX - startX.current;
      if (pullRef.current === 0 && dy < 10) return;
      if (Math.abs(dx) > dy) {
        draggingRef.current = false;
        setDragging(false);
        applyPull(0);
        return;
      }
      if (!atTop() && pullRef.current === 0) {
        draggingRef.current = false;
        setDragging(false);
        return;
      }
      if (dy <= 0) {
        applyPull(0);
        return;
      }
      if (event.cancelable) event.preventDefault();
      rawRef.current = dy;
      applyPull(reducedMotion() ? 0 : resistedPull(dy));
    };

    const onEnd = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      const reduce = reducedMotion();
      const shouldRefresh =
        pullRef.current >= PULL_THRESHOLD || rawRef.current >= (reduce ? PULL_THRESHOLD : PULL_THRESHOLD * 2);
      rawRef.current = 0;
      if (shouldRefresh) {
        void runRefresh();
        return;
      }
      applyPull(0);
    };

    const onWheel = (event: WheelEvent) => {
      if (refreshingRef.current || reducedMotion()) return;
      if (!atTop()) {
        if (pullRef.current) applyPull(0);
        rawRef.current = 0;
        return;
      }
      if (event.deltaY >= 0) {
        if (pullRef.current) applyPull(0);
        rawRef.current = 0;
        return;
      }
      if (event.cancelable) event.preventDefault();
      rawRef.current += -event.deltaY;
      const next = resistedPull(rawRef.current);
      applyPull(next);
      if (next >= PULL_THRESHOLD) {
        rawRef.current = 0;
        void runRefresh();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [runRefresh]);

  return { pull, armed, dragging, refreshing, refresh: runRefresh };
}
