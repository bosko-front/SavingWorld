import { civilDateFromParts, civilDateParts, type CivilDate } from '@/core/calendar';

// Bridge between civil dates (YYYY-MM-DD, no time zone) and the JavaScript Date that native date
// pickers use. Native pickers work in the device's calendar and zone, so the bridge uses local
// date parts and noon, which no DST change can push to another day.

export function civilDateToLocalDate(date: CivilDate): Date {
  const { year, month, day } = civilDateParts(date);
  return new Date(year, month - 1, day, 12);
}

export function localDateToCivilDate(date: Date): CivilDate {
  return civilDateFromParts({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}
