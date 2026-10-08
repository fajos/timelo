import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAllTimeEntries, getAllInvoices, getAllClients, getAllProjects } from '../db/repository';

export async function exportTimeEntriesCsv(): Promise<void> {
  const entries = await getAllTimeEntries();
  const clients = await getAllClients();
  const projects = await getAllProjects();

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const headers = ['ID', 'Client', 'Project', 'Start Time', 'End Time', 'Duration (Hours)', 'Manual', 'Billed Invoice ID', 'Notes'];
  const rows = entries.map((e) => [
    e.id,
    `"${clientMap.get(e.client_id) || e.client_id}"`,
    `"${projectMap.get(e.project_id) || e.project_id}"`,
    e.start_time,
    e.end_time || '',
    (e.duration_seconds / 3600).toFixed(2),
    e.is_manual ? 'Yes' : 'No',
    e.billed_invoice_id || '',
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filePath = `${FileSystem.documentDirectory}time_entries_export.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Time Entries CSV',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

export async function exportInvoicesCsv(): Promise<void> {
  const invoices = await getAllInvoices();
  const clients = await getAllClients();
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const headers = ['Invoice Number', 'Client', 'Status', 'Issue Date', 'Due Date', 'Subtotal', 'Tax %', 'Tax Amount', 'Total Amount', 'Notes'];
  const rows = invoices.map((inv) => [
    inv.invoice_number,
    `"${clientMap.get(inv.client_id) || inv.client_id}"`,
    inv.status,
    inv.issue_date,
    inv.due_date,
    (inv.subtotal_cents / 100).toFixed(2),
    inv.tax_percent,
    (inv.tax_cents / 100).toFixed(2),
    (inv.total_cents / 100).toFixed(2),
    `"${(inv.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filePath = `${FileSystem.documentDirectory}invoices_export.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Invoices CSV',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
