import { describe, expect, test } from 'bun:test';
import { canPerformAction, gateMessagePrefix, isWithinRefundWindow, checkoutReturnEvent, REFUND_GUARANTEE_DAYS } from './billingRules';

describe('entrada paga sem teste', () => {
  test('conta nova sem assinatura fica travada e pede plano mensal ou anual', () => {
    const b = { locked: true, trialEndsAt: null };
    expect(canPerformAction(b)).toBe(false);
    expect(gateMessagePrefix(b)).toBe('Escolha um plano mensal ou anual.');
  });
  test('teste expirado sem assinatura pede assinatura', () => {
    const b = { locked: true, trialEndsAt: '2026-01-01' };
    expect(canPerformAction(b)).toBe(false);
    expect(gateMessagePrefix(b)).toBe('Assinatura necessária.');
  });
  test('assinante ou teste vigente libera ações', () => {
    expect(canPerformAction({ locked: false, trialEndsAt: null })).toBe(true);
  });
});

describe('garantia de reembolso', () => {
  const paid = new Date('2026-10-01T12:00:00Z');
  test('garantia é de 7 dias', () => expect(REFUND_GUARANTEE_DAYS).toBe(7));
  test('dia 7 ainda vale', () => expect(isWithinRefundWindow(paid, new Date('2026-10-08T12:00:00Z'))).toBe(true));
  test('dia 8 não vale', () => expect(isWithinRefundWindow(paid, new Date('2026-10-09T12:00:00Z'))).toBe(false));
});

describe('retorno do checkout', () => {
  test('sucesso', () => expect(checkoutReturnEvent('?success=true')).toBe('checkout_completed'));
  test('cancelado', () => expect(checkoutReturnEvent('?canceled=true')).toBe('checkout_canceled'));
  test('nada', () => expect(checkoutReturnEvent('')).toBe(null));
});
