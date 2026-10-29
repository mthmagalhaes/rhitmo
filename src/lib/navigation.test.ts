// @ts-nocheck — run with: bun test ./src/lib/navigation.test.ts
import { describe, expect, test } from 'bun:test';
import { modeFromPath, resolvePersona } from './navigation';

describe('modeFromPath', () => {
  test('liderado route is member (not leader)', () => expect(modeFromPath('/liderado/inicio')).toBe('member'));
  test('lider route is leader', () => expect(modeFromPath('/lider/inicio')).toBe('leader'));
  test('hr route is company', () => expect(modeFromPath('/hr/pessoas')).toBe('company'));
  test('neutral route is null', () => expect(modeFromPath('/billing')).toBeNull());
});

describe('resolvePersona multi-chapéu (HR + líder + liderado)', () => {
  const base = { isLinkedMember: true, isLeader: true, isHRAdmin: true, isTeamLeader: true };
  test('member mode → direct_report', () => expect(resolvePersona({ ...base, activeMode: 'member' })).toBe('direct_report'));
  test('company mode → hr_admin', () => expect(resolvePersona({ ...base, activeMode: 'company' })).toBe('hr_admin'));
});
