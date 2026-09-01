import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

export function useLongPress({ threshold = 500, onLongPress, onClick }: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActive = useRef(false);

  const start = useCallback((e: React.TouchEvent) => {
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // Ignora se o dispositivo não permitir vibração
        }
      }
      onLongPress();
    }, threshold);
  }, [onLongPress, threshold]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onClick: handleClick,
  };
}
