import { describe, expect, it } from 'vitest';
import { getAccountOverdraftMetrics } from '@/utils/accountOverdraft';

describe('accountOverdraft', () => {
  it('calcula corretamente saldo -110 com limite 110', () => {
    const metrics = getAccountOverdraftMetrics({
      balance: -110,
      hasOverdraft: true,
      overdraftLimit: 110,
    });

    expect(metrics.realBalance).toBe(-110);
    expect(metrics.limit).toBe(110);
    expect(metrics.usedLimit).toBe(110);
    expect(metrics.availableLimit).toBe(0);
    expect(metrics.overLimit).toBe(0);
  });

  it('recalcula limite usado e disponível quando o saldo sobe de -130 para -90', () => {
    const before = getAccountOverdraftMetrics({
      balance: -130,
      hasOverdraft: true,
      overdraftLimit: 110,
    });
    const after = getAccountOverdraftMetrics({
      balance: -90,
      hasOverdraft: true,
      overdraftLimit: 110,
    });

    expect(before.realBalance).toBe(-130);
    expect(before.usedLimit).toBe(110);
    expect(before.availableLimit).toBe(0);
    expect(before.overLimit).toBe(20);

    expect(after.realBalance).toBe(-90);
    expect(after.usedLimit).toBe(90);
    expect(after.availableLimit).toBe(20);
    expect(after.overLimit).toBe(0);
  });
});
