import { civilDateFromParts, type CivilDate } from './civil-date';

// The only place in src/core that reads the real time. Everything else receives a Clock (or the
// civil date it produced) as input, so tests can fix the instant and the time zone.

export type Clock = {
  // Milliseconds since the Unix epoch (UTC). Source of createdAt/startedAt/earnedAt.
  nowMs(): number;
  // IANA time zone the device is in right now, such as 'Europe/Belgrade'.
  timeZone(): string;
};

// The device's civil date at an instant, in a given IANA zone.
export function civilDateAt(instantMs: number, timeZone: string): CivilDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instantMs);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return civilDateFromParts({ year: part('year'), month: part('month'), day: part('day') });
}

// Today's civil date for the clock's current zone. Read it once per command or screen refresh and
// pass the value down; a command never mixes two readings across midnight.
export function today(clock: Clock): CivilDate {
  return civilDateAt(clock.nowMs(), clock.timeZone());
}

// UTC timestamp text for createdAt-style fields, e.g. '2026-10-23T08:15:00.000Z'.
export function utcTimestamp(clock: Clock): string {
  return utcTimestampAt(clock.nowMs());
}

// The same text for a computed instant, such as the end of a saved challenge week.
export function utcTimestampAt(instantMs: number): string {
  return new Date(instantMs).toISOString();
}

// The production clock. The zone is re-read on every call so travel and manual zone changes apply
// at the next foreground refresh (docs/ARCHITECTURE.md "Startup and offline behavior").
export const systemClock: Clock = {
  nowMs: () => Date.now(),
  timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// A clock frozen at one instant and zone, for tests and previews.
export function fixedClock(instantMs: number, timeZone: string): Clock {
  return { nowMs: () => instantMs, timeZone: () => timeZone };
}
