import { describe, it, expect } from 'vitest';
import { estimateCycleCost } from './CalculadoraCusto';
describe('estimateCycleCost', () => {
  it('multiplica liderados × horas × ciclos e usa salário/220h', () => {
    const r = estimateCycleCost({ reports: 8, salary: 22000, hoursPerReport: 3, cycles: 2 });
    expect(r.hours).toBe(48); expect(r.hourly).toBe(100); expect(r.cost).toBe(4800);
  });
});
