// Civil dates, the clock boundary and the deadline pace (docs/DATA_MODEL.md). Pure TypeScript.
export {
  addDays,
  civilDateFromParts,
  civilDateParts,
  compareCivilDates,
  daysBetween,
  daysInMonth,
  fromDayNumber,
  inclusiveDayCount,
  isLeapYear,
  parseCivilDate,
  toDayNumber,
  validateEntryDate,
  validateNewDeadline,
  type CivilDate,
  type CivilDateError,
  type CivilDateParts,
  type DeadlineDateError,
  type EntryDateError,
} from './civil-date';
export { civilDateAt, fixedClock, systemClock, today, utcTimestamp, type Clock } from './clock';
export { deadlineEstimate, type DeadlineEstimate, type DeadlineEstimateInput } from './deadline-estimate';
