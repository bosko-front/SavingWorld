// Identifiers for goals, ledger entries and operations: lowercase RFC 4122 version-4 UUID text.
// IDs only need to be unique on one device; they carry no meaning and are never parsed. The
// platform's crypto.randomUUID / getRandomValues are used when the JavaScript engine provides them,
// otherwise Math.random (still 122 random bits per ID, which is ample for local uniqueness).

export type IdGenerator = { newId(): string };

export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

type CryptoLike = { randomUUID?: () => string; getRandomValues?: (array: Uint8Array) => Uint8Array };

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

export function randomUuid(): string {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (crypto?.randomUUID) {
    return crypto.randomUUID().toLowerCase();
  }
  const bytes = randomBytes();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const uuidGenerator: IdGenerator = { newId: randomUuid };

// Which source randomUuid uses on this engine, for test reports.
export function uuidSource(): 'randomUUID' | 'getRandomValues' | 'Math.random' {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  return crypto?.randomUUID ? 'randomUUID' : crypto?.getRandomValues ? 'getRandomValues' : 'Math.random';
}
