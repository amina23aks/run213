export const ALGIERS_TIME_ZONE = "Africa/Algiers";

export type OverviewRangeKey = "today" | "7d" | "month";

export type DateWindow = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
};

function partsAt(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ALGIERS_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}

// Resolve a local Algeria midnight through Intl rather than hard-coding UTC+01.
function zonedMidnightUtc(year: number, monthIndex: number, day: number) {
  const calendarDate = new Date(Date.UTC(year, monthIndex, day, 12));
  const normalized = partsAt(calendarDate);
  const localNoonAsUtc = Date.UTC(normalized.year, normalized.month - 1, normalized.day, normalized.hour);
  return new Date(Date.UTC(year, monthIndex, day) - (localNoonAsUtc - calendarDate.getTime()));
}

export function getAlgeriaCalendarBoundaries(now = new Date()) {
  const { year, month, day } = partsAt(now);
  return {
    dayStart: zonedMidnightUtc(year, month - 1, day),
    nextDayStart: zonedMidnightUtc(year, month - 1, day + 1),
    monthStart: zonedMidnightUtc(year, month - 1, 1),
    nextMonthStart: zonedMidnightUtc(year, month, 1),
  };
}

export function getOverviewDateWindow(range: OverviewRangeKey, now = new Date()): DateWindow {
  const { year, month, day } = partsAt(now);
  const end = zonedMidnightUtc(year, month - 1, day + 1);
  const start = range === "month"
    ? zonedMidnightUtc(year, month - 1, 1)
    : zonedMidnightUtc(year, month - 1, day - ({ today: 0, "7d": 6 }[range]));
  const duration = end.getTime() - start.getTime();
  return { start, end, previousStart: new Date(start.getTime() - duration), previousEnd: start };
}

export function algiersDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ALGIERS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function algiersDayKeys(start: Date, end: Date) {
  const keys: string[] = [];
  for (let cursor = start.getTime(); cursor < end.getTime(); cursor += 12 * 60 * 60 * 1000) {
    const key = algiersDayKey(new Date(cursor));
    if (keys.at(-1) !== key) keys.push(key);
  }
  return keys;
}
