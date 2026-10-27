// Types for persisted-digest.js (CommonJS, run by Node and Jest unchanged).
type Row = Record<string, string | number | null>;

export type PersistedSummary = {
  migrations: { version: number; name: string; checksum: string }[];
  settings: string[];
  currency: string | null;
  goals: (Row & { id: string; status: string; themeId: string; targetMinor: number; balanceMinor: number; entries: number })[];
  entries: (Row & { id: string; goalId: string; signedMinor: number; entryDate: string; hasNote: number; revision: number })[];
  receipts: { kind: string; count: number }[];
  collectibles: (Row & { goalId: string; themeId: string; themeVersion: number; targetMinorAtAward: number })[];
  attempts: (Row & { id: string; goalId: string; ruleId: string; targetMinor: number | null; state: string; result: string | null })[];
  entitlements: (Row & { productId: string; status: string })[];
  purchaseEvents: (Row & { productId: string; count: number })[];
  missingTables: string[];
};

export type PersistedDigest = { sha256: string; ledgerSha256: string; summary: PersistedSummary };

export function persistedDigest(db: { prepare(sql: string): { all(): unknown[] } }): PersistedDigest;
export function describeDigest(digest: PersistedDigest): string;
