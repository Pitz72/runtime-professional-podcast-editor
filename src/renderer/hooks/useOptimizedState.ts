import React, { useCallback, useMemo, useRef, useState } from 'react';

// Deep comparison utility
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

// Optimized state hook with deep comparison
export const useOptimizedState = <T>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const stateRef = useRef<T>(initialState);

  const optimizedSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    const resolvedState = typeof newState === 'function'
      ? (newState as (prevState: T) => T)(stateRef.current)
      : newState;

    if (!deepEqual(stateRef.current, resolvedState)) {
      stateRef.current = resolvedState;
      setState(resolvedState);
    }
  }, []);

  return [state, optimizedSetState] as const;
};

// Memoized callback with deep dependency comparison
export const useDeepMemoCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const depsRef = useRef<React.DependencyList | undefined>(undefined);
  const callbackRef = useRef<T | undefined>(undefined);

  const memoizedCallback = useMemo(() => {
    if (!depsRef.current || !deepEqual(depsRef.current, deps)) {
      depsRef.current = deps;
      callbackRef.current = callback;
    }
    return callbackRef.current!;
  }, deps);

  return memoizedCallback;
};

// Optimized selector for Zustand with deep comparison
export const useOptimizedSelector = <TState, TResult>(
  selector: (state: TState) => TResult,
  equalityFn: (a: TResult, b: TResult) => boolean = deepEqual
) => {
  const selectorRef = useRef(selector);
  const lastResultRef = useRef<TResult | undefined>(undefined);

  selectorRef.current = selector;

  return useCallback((state: TState) => {
    const result = selectorRef.current(state);

    if (lastResultRef.current === undefined || !equalityFn(lastResultRef.current, result)) {
      lastResultRef.current = result;
      return result;
    }

    return lastResultRef.current;
  }, [equalityFn]);
};

// Performance-optimized component props comparison
export const createPropsComparator = <T extends Record<string, any>>() => {
  return (prevProps: T, nextProps: T): boolean => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
      if (!nextKeys.includes(key)) return false;

      const prevValue = prevProps[key];
      const nextValue = nextProps[key];

      // Skip functions (they change on every render)
      if (typeof prevValue === 'function' && typeof nextValue === 'function') {
        continue;
      }

      if (!deepEqual(prevValue, nextValue)) {
        return false;
      }
    }

    return true;
  };
};

// Lazy initialization hook
export const useLazyInit = <T>(initializer: () => T): T => {
  const ref = useRef<T | undefined>(undefined);

  if (ref.current === undefined) {
    ref.current = initializer();
  }

  return ref.current;
};

// Debounced state updates
export const useDebouncedState = <T>(initialValue: T, delay: number) => {
  const [value, setValue] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedSetValue = useCallback((newValue: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(newValue);
    }, delay);
  }, [delay]);

  return [value, debouncedSetValue] as const;
};

// Throttled updates for high-frequency changes
export const useThrottledState = <T>(initialValue: T, limit: number) => {
  const [value, setValue] = useState<T>(initialValue);
  const lastUpdateRef = useRef<number>(0);

  const throttledSetValue = useCallback((newValue: T) => {
    const now = Date.now();

    if (now - lastUpdateRef.current >= limit) {
      lastUpdateRef.current = now;
      setValue(newValue);
    }
  }, [limit]);

  return [value, throttledSetValue] as const;
};

// Virtual scrolling hook for large lists
export const useVirtualScroll = (itemHeight: number, containerHeight: number, totalItems: number) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    totalItems - 1
  );

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          height: itemHeight,
          width: '100%'
        }
      });
    }
    return items;
  }, [startIndex, endIndex, itemHeight]);

  const totalHeight = totalItems * itemHeight;

  return {
    visibleItems,
    totalHeight,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    }
  };
};