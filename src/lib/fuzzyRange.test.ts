import { describe, it, expect } from 'vitest';
import { findFuzzyRange, replaceFuzzy } from './fuzzyRange';

describe('findFuzzyRange', () => {
  it('acha trecho com formatação e espaços diferentes', () => {
    const md = 'Ela **sempre** entrega no prazo,  com qualidade. [doc:abc]';
    const r = findFuzzyRange(md, 'Ela sempre entrega no prazo com qualidade');
    expect(r).not.toBeNull();
    expect(replaceFuzzy(md, 'Ela sempre entrega no prazo com qualidade', 'Ela entrega no prazo.')).toBe('Ela entrega no prazo.. [doc:abc]');
  });
  it('devolve null quando o trecho não existe mais', () => {
    expect(findFuzzyRange('Texto totalmente novo e editado.', 'Ela sempre entrega no prazo')).toBeNull();
  });
});
