import { addDays, compareCivilDates, toDayNumber, type CivilDate } from './civil-date';
import { civilDateAt } from './clock';

// Calendar weeks and the instant a civil date begins in a time zone (v1.2 section 7 "Sedmični
// korak": the week runs Monday to Sunday in the local time zone at the moment of starting).
// Weekday arithmetic uses the integer day number, so it never depends on the device zone; only
// `startOfCivilDateMs` reads a zone, through Intl, to turn a saved local date into an instant.

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

// 1 = Monday … 7 = Sunday (ISO 8601). Day number 0, 1970-01-01, was a Thursday.
export function isoWeekday(date: CivilDate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return ((((toDayNumber(date) + 3) % 7) + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

// The Monday of the calendar week that contains `date`.
export function weekStartDate(date: CivilDate): CivilDate {
  return addDays(date, 1 - isoWeekday(date));
}

// The Sunday of the calendar week that contains `date`.
export function weekEndDate(date: CivilDate): CivilDate {
  return addDays(date, 7 - isoWeekday(date));
}

// The first instant (UTC milliseconds, on a whole minute) at which the civil date in `timeZone`
// is `date` or later: local midnight, or the first minute after it when a DST change skips
// midnight. Every real zone is within UTC−12..+14, so the answer lies within 26 hours of `date`'s
// UTC midnight; a binary search over minutes finds it in about twelve Intl readings. Zone
// transitions fall on whole minutes. (A zone that turns its clock back across midnight shows the
// earlier date again for a while; the search then returns one of the two midnights. No current
// zone does this on a Sunday night.)
export function startOfCivilDateMs(date: CivilDate, timeZone: string): number {
  const utcMidnight = toDayNumber(date) * DAY_MS;
  let before = (utcMidnight - 26 * 60 * MINUTE_MS) / MINUTE_MS;
  let atOrAfter = (utcMidnight + 26 * 60 * MINUTE_MS) / MINUTE_MS;
  while (atOrAfter - before > 1) {
    const middle = Math.floor((before + atOrAfter) / 2);
    if (compareCivilDates(civilDateAt(middle * MINUTE_MS, timeZone), date) >= 0) {
      atOrAfter = middle;
    } else {
      before = middle;
    }
  }
  return atOrAfter * MINUTE_MS;
}
