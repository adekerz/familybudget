// src/hooks/usePullToRefresh.ts
import { useEffect, useRef } from 'react';
import { triggerRecompute } from '../store/engineBus';
import { usePayPeriodStore } from '../store/usePayPeriodStore';

const THRESHOLD = 80;

export function usePullToRefresh(onRefresh?: () => void) {
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > THRESHOLD && !pullingRef.current) {
        pullingRef.current = true;
      }
    }

    function handleTouchEnd() {
      if (pullingRef.current) {
        triggerRecompute();
        usePayPeriodStore.getState().fetchActivePeriod();
        onRefresh?.();
      }
      startYRef.current = null;
      pullingRef.current = false;
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);
}
