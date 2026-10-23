import {
  addDays,
  civilDateAt,
  civilDateFromParts,
  daysBetween,
  fixedClock,
  fromDayNumber,
  inclusiveDayCount,
  parseCivilDate,
  systemClock,
  toDayNumber,
  today,
  utcTimestamp,
  validateEntryDate,
  validateNewDeadline,
  type CivilDate,
} from '@/core/calendar';

// Civil dates and the clock boundary (TEST_PLAN T08). Instants are written in UTC; the expected
// local dates were worked out from each zone's 2026 offsets and DST rules.

function date(text: string): CivilDate {
  const parsed = parseCivilDate(text);
  if (!parsed.ok) {
    throw new Error(`fixture date ${text} is invalid`);
  }
  return parsed.value;
}

const utc = (iso: string) => Date.parse(iso);

describe('parseCivilDate', () => {
  it.each(['2026-10-23', '2028-02-29', '2000-02-29', '2026-12-31', '0001-01-01', '9999-12-31'])('accepts %s', (text) => {
    expect(parseCivilDate(text)).toEqual({ ok: true, value: text });
  });

  it.each([
    ['2027-02-29', 'invalid_date'],
    ['2100-02-29', 'invalid_date'],
    ['2026-04-31', 'invalid_date'],
    ['2026-13-01', 'invalid_date'],
    ['2026-00-10', 'invalid_date'],
    ['2026-10-00', 'invalid_date'],
    ['0000-01-01', 'invalid_date'],
    ['2026-1-05', 'malformed'],
    ['26-10-23', 'malformed'],
    ['2026/10/23', 'malformed'],
    ['2026-10-23T00:00:00Z', 'malformed'],
    [' 2026-10-23', 'malformed'],
    ['', 'malformed'],
  ])('rejects %j as %s', (text, error) => {
    expect(parseCivilDate(text)).toEqual({ ok: false, error });
  });

  it('builds dates from parts and refuses impossible ones', () => {
    expect(civilDateFromParts({ year: 2028, month: 2, day: 29 })).toBe('2028-02-29');
    expect(() => civilDateFromParts({ year: 2027, month: 2, day: 29 })).toThrow(RangeError);
  });
});

describe('day arithmetic', () => {
  it('agrees with an independent UTC-midnight oracle for every day from 1999-12-01 to 2101-03-01', () => {
    const msPerDay = 86_400_000;
    let current = date('1999-12-01');
    let previous = toDayNumber(current) - 1;
    while (current <= date('2101-03-01')) {
      const [year, month, day] = current.split('-').map(Number) as [number, number, number];
      const oracle = Date.UTC(year, month - 1, day) / msPerDay;
      const dayNumber = toDayNumber(current);
      expect(dayNumber).toBe(oracle);
      expect(dayNumber).toBe(previous + 1);
      expect(fromDayNumber(dayNumber)).toBe(current);
      previous = dayNumber;
      current = addDays(current, 1);
    }
  });

  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-02-29', 1, '2028-03-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-10-23', 30, '2026-11-22'],
    ['2028-02-29', 365, '2029-02-28'],
    ['2028-02-29', 366, '2029-03-01'],
  ])('%s plus %s days is %s', (start, days, expected) => {
    expect(addDays(date(start), days)).toBe(expected);
  });

  it.each([
    ['2026-10-23', '2026-10-23', 1],
    ['2026-10-23', '2026-10-24', 2],
    ['2026-10-23', '2026-11-21', 30],
    ['2026-01-31', '2026-03-01', 30],
    ['2027-02-01', '2027-03-01', 29],
    ['2028-02-01', '2028-03-01', 30],
    ['2028-02-01', '2028-02-29', 29],
    ['2028-01-01', '2028-12-31', 366],
    ['2026-01-01', '2026-12-31', 365],
    ['2026-12-31', '2027-01-01', 2],
    // DST changes in Europe (29 March, 25 October 2026) and the US (8 March, 1 November 2026)
    // do not change a count of calendar days.
    ['2026-03-28', '2026-03-30', 3],
    ['2026-10-24', '2026-10-26', 3],
    ['2026-03-07', '2026-03-09', 3],
    ['2026-10-31', '2026-11-02', 3],
  ])('%s through %s inclusive is %d days', (from, to, expected) => {
    expect(inclusiveDayCount(date(from), date(to))).toBe(expected);
    expect(daysBetween(date(from), date(to))).toBe(expected - 1);
  });
});

describe('date rules', () => {
  const todayDate = date('2026-10-23');

  it('allows entry dates up to today, never later', () => {
    expect(validateEntryDate(date('2026-10-23'), todayDate)).toEqual({ ok: true, value: '2026-10-23' });
    expect(validateEntryDate(date('2020-02-29'), todayDate)).toEqual({ ok: true, value: '2020-02-29' });
    expect(validateEntryDate(date('2026-10-24'), todayDate)).toEqual({ ok: false, error: 'future_date' });
  });

  it('allows a new deadline today or later, never earlier', () => {
    expect(validateNewDeadline(date('2026-10-23'), todayDate)).toEqual({ ok: true, value: '2026-10-23' });
    expect(validateNewDeadline(date('2027-01-01'), todayDate)).toEqual({ ok: true, value: '2027-01-01' });
    expect(validateNewDeadline(date('2026-10-22'), todayDate)).toEqual({ ok: false, error: 'past_deadline' });
  });
});

describe('clock boundary', () => {
  it.each([
    // 2026-10-22 23:30 UTC
    ['UTC', '2026-10-22'],
    ['Europe/Belgrade', '2026-10-23'], // CEST, UTC+2
    ['America/Los_Angeles', '2026-10-22'], // PDT, UTC-7
    ['Pacific/Auckland', '2026-10-23'], // NZDT, UTC+13
    ['Pacific/Kiritimati', '2026-10-23'], // UTC+14
    ['Pacific/Pago_Pago', '2026-10-22'], // UTC-11
  ])('reads the civil date in %s', (zone, expected) => {
    expect(today(fixedClock(utc('2026-10-22T23:30:00Z'), zone))).toBe(expected);
  });

  it('keeps the whole 23-hour spring-forward day on one date (Belgrade, 29 March 2026)', () => {
    expect(civilDateAt(utc('2026-03-28T22:59:59Z'), 'Europe/Belgrade')).toBe('2026-03-28');
    expect(civilDateAt(utc('2026-03-28T23:00:00Z'), 'Europe/Belgrade')).toBe('2026-03-29'); // 00:00 CET
    expect(civilDateAt(utc('2026-03-29T21:59:59Z'), 'Europe/Belgrade')).toBe('2026-03-29'); // 23:59 CEST
    expect(civilDateAt(utc('2026-03-29T22:00:00Z'), 'Europe/Belgrade')).toBe('2026-03-30');
  });

  it('keeps the whole 25-hour fall-back day on one date (Los Angeles, 1 November 2026)', () => {
    expect(civilDateAt(utc('2026-11-01T07:00:00Z'), 'America/Los_Angeles')).toBe('2026-11-01'); // 00:00 PDT
    expect(civilDateAt(utc('2026-11-02T07:59:59Z'), 'America/Los_Angeles')).toBe('2026-11-01'); // 23:59 PST
    expect(civilDateAt(utc('2026-11-02T08:00:00Z'), 'America/Los_Angeles')).toBe('2026-11-02');
  });

  it('reads leap day at its local midnight', () => {
    expect(civilDateAt(utc('2028-02-28T23:00:00Z'), 'Europe/Belgrade')).toBe('2028-02-29');
    expect(civilDateAt(utc('2028-02-29T23:00:00Z'), 'Europe/Belgrade')).toBe('2028-03-01');
  });

  it('writes UTC timestamps for createdAt fields', () => {
    expect(utcTimestamp(fixedClock(utc('2026-10-23T08:15:00Z'), 'Europe/Belgrade'))).toBe('2026-10-23T08:15:00.000Z');
  });

  it('reads the real device time and zone through systemClock only', () => {
    const before = Date.now();
    const zone = systemClock.timeZone();
    const now = systemClock.nowMs();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
    expect(zone.length).toBeGreaterThan(0);
    expect([civilDateAt(before, zone), civilDateAt(after, zone)]).toContain(today(systemClock));
  });
});
