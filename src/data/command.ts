import { err, ok, type Result } from '@/core/result';

import type { AppDatabase } from './db/database';
import type { SqlExecutor } from './db/sql';
import { isEntityId } from './ids';

// Shared plumbing for application commands (docs/ARCHITECTURE.md "Financial mutation flow").
//
// A command validates its input, then runs one task on the serialized exclusive write path. Inside
// the task a rule violation is raised with `reject(...)`, which rolls the transaction back and comes
// out as a typed failure. Any other exception is a storage failure: the transaction rolled back,
// nothing was saved, and the caller keeps the person's input to retry with the same operation ID.
// Success is only reported after COMMIT returned, never optimistically.

export type StorageFailure = { code: 'storage_failure'; message: string };

export type CommandFailure<E> = E | StorageFailure;

class CommandRejection<E> extends Error {
  readonly failure: E;

  constructor(failure: E) {
    super('Command rejected');
    this.name = 'CommandRejection';
    this.failure = failure;
  }
}

export function reject<E>(failure: E): never {
  throw new CommandRejection(failure);
}

export async function executeCommand<T, E>(
  db: AppDatabase,
  task: (tx: SqlExecutor) => Promise<T>,
): Promise<Result<T, CommandFailure<E>>> {
  try {
    return ok(await db.write(task));
  } catch (error) {
    if (error instanceof CommandRejection) {
      return err(error.failure as E);
    }
    // Messages come from SQLite or our own decoders and never include bound values.
    return err({ code: 'storage_failure', message: error instanceof Error ? error.message : String(error) });
  }
}

export type OperationIdError = { code: 'invalid_operation_id' };

// The caller creates one operation ID per submitted form and reuses it for every retry.
export function checkOperationId(operationId: string): OperationIdError | null {
  return isEntityId(operationId) ? null : { code: 'invalid_operation_id' };
}
