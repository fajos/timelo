import { formatCurrency, calculateInvoiceTotals, formatNextInvoiceNumber } from '../src/utils/formatters';

describe('Timelo Business Calculations & Formatting', () => {
  test('formatCurrency formats integer cents correctly', () => {
    expect(formatCurrency(5000, 'USD')).toContain('50.00');
    expect(formatCurrency(12345, 'USD')).toContain('123.45');
    expect(formatCurrency(0, 'USD')).toContain('0.00');
  });

  test('Subtotal and tax cents calculations eliminate floating point rounding errors', () => {
    const hourlyRateCents = 7500; // $75.00/hr
    const durationHours = 2.5; // 2.5 hours

    const { subtotalCents, taxCents, totalCents } = calculateInvoiceTotals(durationHours, hourlyRateCents, 10);

    expect(subtotalCents).toBe(18750); // $187.50
    expect(taxCents).toBe(1875); // $18.75
    expect(totalCents).toBe(20625); // $206.25
  });

  test('Sequential invoice number formatting padded correctly', () => {
    const nextInvoiceNum = formatNextInvoiceNumber(5);
    expect(nextInvoiceNum).toBe('INV-006');
  });
});
