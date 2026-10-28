/** Google Calendar all-day events carry only `start.date` (no `dateTime`). */
export function isAllDayEvent(start: { dateTime?: string; date?: string } | undefined): boolean {
  return !!start?.date && !start?.dateTime;
}
