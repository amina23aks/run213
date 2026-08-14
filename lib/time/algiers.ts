const ALGIERS_TIME_ZONE = "Africa/Algiers";

type AlgeriaBoundaries = {
  dayStart: Date;
  nextDayStart: Date;
  monthStart: Date;
  nextMonthStart: Date;
};

function partsAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ALGIERS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}

// Algeria currently uses UTC+01:00 year-round. Deriving the offset through Intl
// keeps this helper correct if the IANA timezone rules change later.
function zonedMidnightUtc(year: number, monthIndex: number, day: number) {
  const calendarDate = new Date(Date.UTC(year, monthIndex, day, 12));
  const normalized = partsAt(calendarDate);
  const localNoonAsUtc = Date.UTC(normalized.year, normalized.month - 1, normalized.day, normalized.hour);
  const offset = localNoonAsUtc - calendarDate.getTime();
  return new Date(Date.UTC(year, monthIndex, day) - offset);
}

export function getAlgeriaCalendarBoundaries(now = new Date()): AlgeriaBoundaries {
  const { year, month, day } = partsAt(now);
  return {
    dayStart: zonedMidnightUtc(year, month - 1, day),
    nextDayStart: zonedMidnightUtc(year, month - 1, day + 1),
    monthStart: zonedMidnightUtc(year, month - 1, 1),
    nextMonthStart: zonedMidnightUtc(year, month, 1),
  };
}
