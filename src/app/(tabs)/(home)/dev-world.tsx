import { useLocalSearchParams } from 'expo-router';

import type { Stage } from '@/core/progression';

// Development/test-only world inspector (Phase 09). Guarded by Stack.Protected in the Home stack;
// the module is required only inside `if (__DEV__)`, so release bundles omit it.
// `?theme=island|garden`, `?stage=0..10`, `?backdrop=sky|cream|none` and `?view=sheet` set the
// starting state.
export default function DevWorldRoute() {
  const { theme, stage, backdrop, view } = useLocalSearchParams<{ theme?: string; stage?: string; backdrop?: string; view?: string }>();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WorldInspector } = require('@/dev/world-inspector') as typeof import('@/dev/world-inspector');
    const parsed = Number(stage);
    return (
      // A new deep link to the open inspector starts it again from the link's state.
      <WorldInspector
        key={`${theme}-${stage}-${backdrop}-${view}`}
        themeId={theme === 'garden' ? 'garden' : 'island'}
        stage={(Number.isInteger(parsed) && parsed >= 0 && parsed <= 10 ? parsed : 0) as Stage}
        backdrop={backdrop === 'cream' || backdrop === 'none' ? backdrop : 'sky'}
        view={view === 'sheet' ? 'sheet' : 'single'}
      />
    );
  }
  return null;
}
