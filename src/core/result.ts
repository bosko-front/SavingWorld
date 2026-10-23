// Outcome of validating user or stored input. Domain functions return a Result for anything a
// person can get wrong (typed text, a chosen date) and throw only for programmer errors, such as a
// target that already failed validation being passed back in.
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
