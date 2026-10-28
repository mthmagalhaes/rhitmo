// @ts-nocheck — run with: bun test ./src/lib/allDayEvent.test.ts
import { describe, expect, test } from "bun:test";
import { isAllDayEvent } from "../../supabase/functions/fetch-calendar-events/allDay";

describe("isAllDayEvent", () => {
  test("evento só com data (dia inteiro) é ignorado", () => {
    expect(isAllDayEvent({ date: "2026-10-28" })).toBe(true);
  });
  test("evento com horário é mantido", () => {
    expect(isAllDayEvent({ dateTime: "2026-10-28T15:00:00-03:00" })).toBe(false);
  });
});
