import { err, ok, type Result } from '../result';

// Local calendar dates ("civil dates") as YYYY-MM-DD text: entry dates, deadlines, challenge
// periods (docs/DATA_MODEL.md). A civil date is not an instant and is never converted through
// midnight UTC or a Date object. Arithmetic uses an integer day number, so day counts do not care
// about DST, 23/25-hour days or the device time zone.

declare const civilDateBrand: unique symbol;
export type CivilDate = string & { readonly [civilDateBrand]: true };

export type CivilDateParts = { year: number; month: number; day: number };

export type CivilDateError = 'malformed' | 'invalid_date';

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function isValidParts({ year, month, day }: CivilDateParts): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

// Validates text from storage, a route or a picker: '2028-02-29' passes, '2027-02-29',
// '2026-1-5' and '2026-10-23T00:00' fail.
export function parseCivilDate(text: string): Result<CivilDate, CivilDateError> {
  const match = CIVIL_DATE_PATTERN.exec(text);
  if (!match) {
    return err('malformed');
  }
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  return isValidParts(parts) ? ok(text as CivilDate) : err('invalid_date');
}

export function civilDateFromParts(parts: CivilDateParts): CivilDate {
  if (!isValidParts(parts)) {
    throw new RangeError(`not a calendar date: ${parts.year}-${parts.month}-${parts.day}`);
  }
  const pad = (value: number, width: number) => String(value).padStart(width, '0');
  return `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}` as CivilDate;
}

export function civilDateParts(date: CivilDate): CivilDateParts {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) };
}

// Days since 1970-01-01 in the proleptic Gregorian calendar (H. Hinnant's days_from_civil).
export function toDayNumber(date: CivilDate): number {
  const { year, month, day } = civilDateParts(date);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

export function fromDayNumber(dayNumber: number): CivilDate {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return civilDateFromParts({ year, month, day });
}

export function addDays(date: CivilDate, days: number): CivilDate {
  if (!Number.isInteger(days)) {
    throw new RangeError('days must be an integer');
  }
  return fromDayNumber(toDayNumber(date) + days);
}

// YYYY-MM-DD with a four-digit year sorts lexicographically in calendar order.
export function compareCivilDates(a: CivilDate, b: CivilDate): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Signed number of days from `from` to `to`: 2026-10-23 → 2026-10-24 is 1.
export function daysBetween(from: CivilDate, to: CivilDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

// Calendar days from `from` through `to`, counting both: the same date is 1. The v1.2 deadline D.
export function inclusiveDayCount(from: CivilDate, to: CivilDate): number {
  return daysBetween(from, to) + 1;
}

export type EntryDateError = 'future_date';

// An entry date may be today or earlier, never later (v1.2 section 3).
export function validateEntryDate(date: CivilDate, today: CivilDate): Result<CivilDate, EntryDateError> {
  return compareCivilDates(date, today) > 0 ? err('future_date') : ok(date);
}

export type DeadlineDateError = 'past_deadline';

// A new or changed deadline may be today or later. An existing deadline may expire on its own;
// this check applies only when the person sets it (v1.2 section 7).
export function validateNewDeadline(deadline: CivilDate, today: CivilDate): Result<CivilDate, DeadlineDateError> {
  return compareCivilDates(deadline, today) < 0 ? err('past_deadline') : ok(deadline);
}
