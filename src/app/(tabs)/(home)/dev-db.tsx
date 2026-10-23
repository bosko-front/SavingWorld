import { useLocalSearchParams } from 'expo-router';

// Development/test-only native database runner (docs/TEST_PLAN.md, `npm run test:db`). Guarded by
// Stack.Protected in the Home stack; the module (and the tests/native scenarios it bundles) is
// required only inside `if (__DEV__)`, so release bundles omit it.
// `?run=<id>` starts a run once per ID; `suite=restart-verify&seed=<id>` checks a restart seed.
export default function DevDatabaseTestsRoute() {
  const { run, suite, seed } = useLocalSearchParams<{ run?: string; suite?: string; seed?: string }>();
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DbTestRunner } = require('@/dev/db-test-runner') as typeof import('@/dev/db-test-runner');
    const safeId = (value: string | undefined) => (value && /^[a-z0-9]{1,40}$/.test(value) ? value : null);
    return (
      <DbTestRunner
        runId={safeId(run)}
        suite={suite === 'restart-verify' ? 'restart-verify' : 'all'}
        seedId={safeId(seed)}
      />
    );
  }
  return null;
}
