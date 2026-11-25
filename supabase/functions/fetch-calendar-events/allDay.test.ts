import { describe, expect, test } from "bun:test";
import { isAllDayEvent } from "./allDay.ts";

describe("isAllDayEvent", () => {
  test("evento de dia inteiro (só date) nunca vira reunião", () => {
    expect(isAllDayEvent({ date: "2026-11-26" })).toBe(true);
  });
  test("evento com horário é reunião", () => {
    expect(isAllDayEvent({ dateTime: "2026-11-26T14:00:00-03:00" })).toBe(false);
  });
});
