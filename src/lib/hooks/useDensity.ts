'use client';

import { useCallback, useEffect, useState } from 'react';

export type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'tretro-density';

function readStoredDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'compact' ? 'compact' : 'comfortable';
}

function applyDensity(density: Density) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-density', density);
}

export function useDensity() {
  const [density, setDensityState] = useState<Density>('comfortable');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = readStoredDensity();
    setDensityState(initial);
    applyDensity(initial);
    setHydrated(true);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    applyDensity(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setDensity(density === 'compact' ? 'comfortable' : 'compact');
  }, [density, setDensity]);

  return { density, setDensity, toggle, hydrated };
}
