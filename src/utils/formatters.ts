export function formatCurrency(cents: number, currencyCode = 'USD'): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function calculateInvoiceTotals(
  hours: number,
  rateCents: number,
  taxPercent: number
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = Math.round(hours * rateCents);
  const taxCents = Math.round((subtotalCents * taxPercent) / 100);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

export function formatNextInvoiceNumber(count: number): string {
  return `INV-${(count + 1).toString().padStart(3, '0')}`;
}
