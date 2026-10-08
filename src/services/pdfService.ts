import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Invoice, InvoiceItem, Client, UserSettings } from '../types';

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

export async function generateInvoicePdfHtml(
  invoice: Invoice,
  items: InvoiceItem[],
  client: Client,
  settings: UserSettings,
  isPro: boolean
): Promise<string> {
  const logoHtml =
    isPro && settings.logo_uri
      ? `<img src="${settings.logo_uri}" style="max-height: 60px; max-width: 200px; margin-bottom: 12px;" />`
      : '';

  const itemsRows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: left;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">${item.hours.toFixed(2)} hrs</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">${formatCurrency(
        item.rate_cents,
        client.currency
      )}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600;">${formatCurrency(
        item.amount_cents,
        client.currency
      )}</td>
    </tr>
  `
    )
    .join('');

  const footerHtml = !isPro
    ? `<div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
        Sent with <strong>Timelo</strong> &bull; Track. Invoice. Get Paid.
       </div>`
    : '';

  const statusColor =
    invoice.status === 'paid'
      ? '#10B981'
      : invoice.status === 'overdue'
      ? '#EF4444'
      : invoice.status === 'sent'
      ? '#3B82F6'
      : '#64748B';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
            margin: 0;
            padding: 30px;
            background-color: #FFFFFF;
          }
          .header-table {
            width: 100%;
            margin-bottom: 30px;
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            color: #FFFFFF;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            background-color: ${statusColor};
          }
          .details-box {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .items-table th {
            background-color: #F8FAFC;
            padding: 10px;
            border-bottom: 2px solid #CBD5E1;
            font-size: 12px;
            text-transform: uppercase;
            color: #475569;
          }
          .totals-table {
            width: 300px;
            margin-left: auto;
            margin-bottom: 30px;
          }
          .totals-table td {
            padding: 6px 10px;
          }
          .notes-box {
            background-color: #F8FAFC;
            padding: 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 13px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: top;">
              ${logoHtml}
              <div style="font-size: 20px; font-weight: 800; color: #0F172A;">${settings.business_name || 'Freelancer'}</div>
              <div style="font-size: 13px; color: #475569;">${settings.business_email}</div>
              <div style="font-size: 13px; color: #475569; white-space: pre-line;">${settings.business_address}</div>
              ${settings.tax_id ? `<div style="font-size: 12px; color: #64748B;">Tax ID: ${settings.tax_id}</div>` : ''}
            </td>
            <td style="vertical-align: top; text-align: right;">
              <div style="font-size: 28px; font-weight: 900; color: #0F172A; margin-bottom: 6px;">INVOICE</div>
              <div style="font-size: 16px; font-weight: 700; color: #3B82F6;">${invoice.invoice_number}</div>
              <div style="margin-top: 8px;"><span class="status-badge">${invoice.status}</span></div>
            </td>
          </tr>
        </table>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; padding: 16px 0;">
          <div>
            <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 4px;">Billed To:</div>
            <div style="font-size: 15px; font-weight: 700;">${client.name}</div>
            <div style="font-size: 13px; color: #475569;">${client.email}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px;"><strong style="color: #64748B;">Issue Date:</strong> ${invoice.issue_date}</div>
            <div style="font-size: 13px; margin-top: 4px;"><strong style="color: #64748B;">Due Date:</strong> ${invoice.due_date}</div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align: left;">Description</th>
              <th style="text-align: right;">Hours</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #64748B; text-align: right;">Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(invoice.subtotal_cents, client.currency)}</td>
          </tr>
          ${
            invoice.tax_percent > 0
              ? `
          <tr>
            <td style="color: #64748B; text-align: right;">Tax (${invoice.tax_percent}%):</td>
            <td style="text-align: right; font-weight: 600;">${formatCurrency(invoice.tax_cents, client.currency)}</td>
          </tr>
          `
              : ''
          }
          <tr style="border-top: 2px solid #0F172A;">
            <td style="font-size: 16px; font-weight: 800; text-align: right; padding-top: 10px;">Total Due:</td>
            <td style="font-size: 16px; font-weight: 800; color: #2563EB; text-align: right; padding-top: 10px;">${formatCurrency(
              invoice.total_cents,
              client.currency
            )}</td>
          </tr>
        </table>

        ${
          invoice.payment_instructions
            ? `
        <div class="notes-box">
          <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;">Payment Instructions:</div>
          <div style="color: #334155; white-space: pre-line;">${invoice.payment_instructions}</div>
        </div>
        `
            : ''
        }

        ${
          invoice.notes
            ? `
        <div class="notes-box" style="margin-top: 10px; background-color: #FFFFFF; border: 1px solid #E2E8F0;">
          <div style="font-weight: 700; color: #0F172A; margin-bottom: 4px;">Notes:</div>
          <div style="color: #475569; white-space: pre-line;">${invoice.notes}</div>
        </div>
        `
            : ''
        }

        ${footerHtml}
      </body>
    </html>
  `;
}

export async function generateAndShareInvoicePdf(
  invoice: Invoice,
  items: InvoiceItem[],
  client: Client,
  settings: UserSettings,
  isPro: boolean
): Promise<void> {
  const html = await generateInvoicePdfHtml(invoice, items, client, settings, isPro);
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice ${invoice.invoice_number} - ${client.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
