import { useState } from 'react';

// Development/test-only remount detector. Each new mount of a component instance under `key`
// increments the count once; re-renders and re-layouts do not. A count above 1 after resizing,
// folding or rotating means the instance (and any local state, focus or selection) was rebuilt.
const mounts = new Map<string, number>();

export function useMountCount(key: string): number {
  const [count] = useState(() => {
    const next = (mounts.get(key) ?? 0) + 1;
    mounts.set(key, next);
    return next;
  });
  return count;
}

export function resetMountCounts(): void {
  mounts.clear();
}
