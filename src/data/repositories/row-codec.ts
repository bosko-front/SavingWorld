import { parseCivilDate, type CivilDate } from '@/core/calendar';
import { isMinorAmount } from '@/core/money';

import type { SqlRow } from '../db/sql';

// Database boundary validation (docs/DEVELOPMENT_RULES.md): every row is checked before it becomes a
// typed record. A failing row means the file was changed outside the app or a bug slipped past the
// schema constraints; it is reported, never repaired or silently skipped.
export class CorruptRowError extends Error {
  constructor(table: string, column: string) {
    super(`Unexpected value in ${table}.${column}`);
    this.name = 'CorruptRowError';
  }
}

export function rowReader(table: string, row: SqlRow) {
  const fail = (column: string): never => {
    throw new CorruptRowError(table, column);
  };
  return {
    text(column: string): string {
      const value = row[column];
      return typeof value === 'string' ? value : fail(column);
    },
    optionalText(column: string): string | null {
      const value = row[column];
      return value === null ? null : typeof value === 'string' ? value : fail(column);
    },
    integer(column: string): number {
      const value = row[column];
      return typeof value === 'number' && Number.isSafeInteger(value) ? value : fail(column);
    },
    minor(column: string): number {
      const value = row[column];
      return isMinorAmount(value) ? value : fail(column);
    },
    civilDate(column: string): CivilDate {
      const parsed = parseCivilDate(this.text(column));
      return parsed.ok ? parsed.value : fail(column);
    },
    optionalCivilDate(column: string): CivilDate | null {
      const value = this.optionalText(column);
      if (value === null) {
        return null;
      }
      const parsed = parseCivilDate(value);
      return parsed.ok ? parsed.value : fail(column);
    },
    oneOf<T extends string>(column: string, allowed: readonly T[]): T {
      const value = this.text(column);
      return (allowed as readonly string[]).includes(value) ? (value as T) : fail(column);
    },
  };
}
