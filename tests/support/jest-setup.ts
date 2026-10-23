import { setAppDatabaseDriverForTests } from '@/bootstrap/database-readiness';

import { createNodeSqliteDriver, temporaryDirectory } from './node-sqlite-driver';

// Jest cannot load the native Expo SQLite module, so tests that render the app open its database
// through host SQLite in a fresh temporary directory per test file. Native behavior is verified by
// `npm run test:db` on an iOS simulator, not here.
setAppDatabaseDriverForTests(createNodeSqliteDriver(temporaryDirectory('app')));
