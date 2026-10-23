import { err, ok, type Result } from '../result';

// Free text a person types (goal titles, entry notes). Stored exactly as normalized here: Unicode
// NFC, surrounding whitespace trimmed, length counted in code points (as SQLite length() does), no
// control characters except line breaks/tabs where allowed, and no unpaired surrogates (which would
// not survive UTF-8 storage). SQL-special characters such as quotes, %, _ and ; are ordinary text:
// queries always bind values, so nothing needs escaping.

export type UserTextError = 'empty' | 'too_long' | 'invalid_character';

export type UserTextRules = { maxLength: number; allowLineBreaks: boolean };

function isAllowedCodePoint(code: number, allowLineBreaks: boolean): boolean {
  if (code >= 0xd800 && code <= 0xdfff) {
    return false;
  }
  if (code === 0x0a || code === 0x09) {
    return allowLineBreaks;
  }
  return !(code < 0x20 || (code >= 0x7f && code <= 0x9f));
}

export function normalizeUserText(input: string, rules: UserTextRules): Result<string, UserTextError> {
  const normalized = input.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  if (normalized.length === 0) {
    return err('empty');
  }
  let length = 0;
  for (const char of normalized) {
    if (!isAllowedCodePoint(char.codePointAt(0) ?? 0, rules.allowLineBreaks)) {
      return err('invalid_character');
    }
    length += 1;
  }
  return length > rules.maxLength ? err('too_long') : ok(normalized);
}
