import { setUpTests } from 'react-native-reanimated';

import { setAppDatabaseDriverForTests } from '@/bootstrap/database-readiness';
import { setReduceMotionForTests } from '@/shared/ui/motion-preferences';

import { createNodeSqliteDriver, temporaryDirectory } from './node-sqlite-driver';

// Jest cannot load the native Expo SQLite module, so tests that render the app open its database
// through host SQLite in a fresh temporary directory per test file. Native behavior is verified by
// `npm run test:db` on an iOS simulator, not here.
setAppDatabaseDriverForTests(createNodeSqliteDriver(temporaryDirectory('app')));

// Reanimated's Jest mode (its resolver in package.json picks the non-native worklets build) and
// Gesture Handler's Jest mocks; package.json maps its native UI-runtime bindings to a no-op.
setUpTests();
require('react-native-gesture-handler/jestSetup');

// Suites see committed values at once, as with Reduce Motion; tests of the Phase 10 motion turn it
// off themselves (tests/integration/world-motion.test.tsx).
setReduceMotionForTests(true);
