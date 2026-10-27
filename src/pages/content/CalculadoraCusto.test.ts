// @ts-nocheck — run with: bun test src/pages/content/CalculadoraCusto.test.ts
import { describe, it, expect } from 'bun:test';
import { estimateCycleCost, estimateCycle, DEFAULT_STEPS } from './CalculadoraCusto';
describe('estimateCycleCost', () => {
  it('multiplica liderados × horas × ciclos e usa salário/220h', () => {
    const r = estimateCycleCost({ reports: 8, salary: 22000, hoursPerReport: 3, cycles: 2 });
    expect(r.hours).toBe(48); expect(r.hourly).toBe(100); expect(r.cost).toBe(4800);
  });
});
describe('estimateCycle', () => {
  const base = { mode: 'team', people: 8, salary: 22000, cycles: 2, steps: DEFAULT_STEPS, reviewMinutes: 30 };
  it('hoje: 8 × (45+90+45 min) × 2 = 48h e R$ 4.800', () => {
    const r = estimateCycle(base);
    expect(r.todayHours).toBe(48); expect(r.todayCost).toBe(4800);
  });
  it('com Rhitmo: revisão de 30 min substitui reconstrução+escrita = 20h e R$ 2.000', () => {
    const r = estimateCycle(base);
    expect(r.rhitmoHours).toBe(20); expect(r.rhitmoCost).toBe(2000); expect(r.savedHours).toBe(28);
  });
  it('empresa inclui autoavaliação nos dois lados', () => {
    const r = estimateCycle({ ...base, mode: 'company' });
    expect(r.todayHours).toBe(56); expect(r.rhitmoHours).toBe(28);
  });
});
