import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { sameSize, type Size } from './metrics';

const UNMEASURED: Size = { width: 0, height: 0 };

// Local, ephemeral measurement of one region. The size lives in component state only: never in a
// store, SQLite or a module variable, and never in financial logic.
export function useMeasuredSize(): [Size, (event: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<Size>(UNMEASURED);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (sameSize(current, { width, height }) ? current : { width, height }));
  }, []);
  return [size, onLayout];
}
