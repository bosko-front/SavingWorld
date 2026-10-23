import { err, ok, type Result } from '../result';

import type { CurrencyExponent } from './currency';
import { MAX_MINOR } from './minor-units';
import type { NumberSeparators } from './separators';

// Strict text → minor units for every user-entered money amount (goal target, deposit, withdrawal).
// Pure string and BigInt work: no Number/parseFloat, no rounding. Anything the parser cannot read
// in exactly one way is rejected, so the same text always gives the same result or the same error:
//
// - ASCII digits plus the locale's decimal and group separators only. Signs, letters, currency
//   symbols, exponent notation (1e3), Infinity and NaN are rejected.
// - Grouping must match the locale exactly (1,234,567 or Indian 12,34,567). Wrong group sizes are
//   rejected, so "1,5" typed with en-US separators is an error, not 15.
// - At most `exponent` decimals; extra digits, even zeros, are rejected rather than rounded. A
//   zero-decimal currency such as JPY accepts no decimal separator at all.
// - The result is 1..MAX_MINOR. The entry kind, not the text, decides deposit or withdrawal.

export type AmountParseError =
  | 'empty'
  | 'signed'
  | 'invalid_character'
  | 'malformed'
  | 'malformed_grouping'
  | 'too_many_decimals'
  | 'not_positive'
  | 'too_large';

const SPACE_GROUPS = [' ', ' ', ' '];
const APOSTROPHE_GROUPS = ["'", '’'];
const SIGNS = ['+', '-', '−'];
const MAX_SIGNIFICANT_DIGITS = String(MAX_MINOR).length;

export function parseAmount(
  text: string,
  exponent: CurrencyExponent,
  separators: NumberSeparators,
): Result<number, AmountParseError> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return err('empty');
  }
  if (SIGNS.includes(trimmed.charAt(0))) {
    return err('signed');
  }

  const { decimal, group } = separators;
  const groupAliases = equivalentGroups(group);
  let normalized = '';
  for (const char of trimmed) {
    if (char >= '0' && char <= '9') {
      normalized += char;
    } else if (char === decimal) {
      normalized += '.';
    } else if (groupAliases.includes(char)) {
      normalized += ',';
    } else {
      return err('invalid_character');
    }
  }

  const pieces = normalized.split('.');
  if (pieces.length > 2) {
    return err('malformed');
  }
  const [integerText = '', fraction] = pieces;
  if (integerText === '' || fraction === '') {
    return err('malformed');
  }
  if (fraction !== undefined && fraction.includes(',')) {
    return err('malformed_grouping');
  }

  const integerDigits = integerText.includes(',') ? ungroup(integerText, separators.grouping) : integerText;
  if (integerDigits === null) {
    return err('malformed_grouping');
  }

  const fractionDigits = fraction ?? '';
  if (fractionDigits.length > exponent) {
    return err('too_many_decimals');
  }

  const digits = (integerDigits + fractionDigits.padEnd(exponent, '0')).replace(/^0+/, '');
  if (digits === '') {
    return err('not_positive');
  }
  // Longer than the ceiling's digit count is out of range before any BigInt work.
  if (digits.length > MAX_SIGNIFICANT_DIGITS || BigInt(digits) > BigInt(MAX_MINOR)) {
    return err('too_large');
  }
  return ok(Number(digits));
}

// Characters a person may type for the locale's group separator. iOS keyboards cannot type the
// narrow no-break space French uses, or the typographic apostrophe Swiss German uses.
function equivalentGroups(group: string): string[] {
  if (group === '') {
    return [];
  }
  if (SPACE_GROUPS.includes(group)) {
    return SPACE_GROUPS;
  }
  if (APOSTROPHE_GROUPS.includes(group)) {
    return APOSTROPHE_GROUPS;
  }
  return [group];
}

// "1,234,567" → "1234567" when every group has the locale's size, otherwise null.
function ungroup(integerText: string, grouping: NumberSeparators['grouping']): string | null {
  const groups = integerText.split(',');
  const first = groups[0] ?? '';
  const last = groups[groups.length - 1] ?? '';
  const middle = groups.slice(1, -1);

  const valid =
    grouping === 'thousands'
      ? /^\d{1,3}$/.test(first) && groups.slice(1).every((g) => /^\d{3}$/.test(g))
      : /^\d{1,2}$/.test(first) && middle.every((g) => /^\d{2}$/.test(g)) && /^\d{3}$/.test(last);
  return valid ? groups.join('') : null;
}
