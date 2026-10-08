import { getDatabase } from './database';
import { Client, Project, TimeEntry, Invoice, InvoiceItem, UserSettings, InvoiceStatus } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ==================== CLIENTS ====================
export async function getAllClients(): Promise<Client[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Client>('SELECT * FROM clients ORDER BY name ASC');
}

export async function getClientById(id: string): Promise<Client | null> {
  const db = await getDatabase();
  return await db.getFirstAsync<Client>('SELECT * FROM clients WHERE id = ?', [id]);
}

export async function insertClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
  const db = await getDatabase();
  const newClient: Client = {
    ...client,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO clients (id, name, email, hourly_rate_cents, currency, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      newClient.id,
      newClient.name,
      newClient.email,
      newClient.hourly_rate_cents,
      newClient.currency,
      newClient.created_at,
    ]
  );

  return newClient;
}

export async function updateClient(client: Client): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE clients SET name = ?, email = ?, hourly_rate_cents = ?, currency = ? WHERE id = ?`,
    [client.name, client.email, client.hourly_rate_cents, client.currency, client.id]
  );
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM clients WHERE id = ?', [id]);
}

// ==================== PROJECTS ====================
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Project>('SELECT * FROM projects ORDER BY name ASC');
}

export async function getProjectsByClient(clientId: string): Promise<Project[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Project>('SELECT * FROM projects WHERE client_id = ? ORDER BY name ASC', [clientId]);
}

export async function insertProject(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
  const db = await getDatabase();
  const newProject: Project = {
    ...project,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO projects (id, client_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)`,
    [newProject.id, newProject.client_id, newProject.name, newProject.color, newProject.created_at]
  );

  return newProject;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
}

// ==================== TIME ENTRIES ====================
export async function getAllTimeEntries(): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM time_entries ORDER BY start_time DESC');
  return rows.map((r) => ({
    ...r,
    is_manual: Boolean(r.is_manual),
  }));
}

export async function getUnbilledEntriesForClient(clientId: string): Promise<TimeEntry[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM time_entries WHERE client_id = ? AND (billed_invoice_id IS NULL OR billed_invoice_id = "") AND end_time IS NOT NULL ORDER BY start_time DESC',
    [clientId]
  );
  return rows.map((r) => ({
    ...r,
    is_manual: Boolean(r.is_manual),
  }));
}

export async function insertTimeEntry(entry: Omit<TimeEntry, 'id' | 'created_at'>): Promise<TimeEntry> {
  const db = await getDatabase();
  const newEntry: TimeEntry = {
    ...entry,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO time_entries (id, project_id, client_id, start_time, end_time, duration_seconds, is_manual, billed_invoice_id, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newEntry.id,
      newEntry.project_id,
      newEntry.client_id,
      newEntry.start_time,
      newEntry.end_time,
      newEntry.duration_seconds,
      newEntry.is_manual ? 1 : 0,
      newEntry.billed_invoice_id,
      newEntry.notes,
      newEntry.created_at,
    ]
  );

  return newEntry;
}

export async function updateTimeEntry(entry: TimeEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE time_entries SET project_id = ?, client_id = ?, start_time = ?, end_time = ?, duration_seconds = ?, is_manual = ?, billed_invoice_id = ?, notes = ? WHERE id = ?`,
    [
      entry.project_id,
      entry.client_id,
      entry.start_time,
      entry.end_time,
      entry.duration_seconds,
      entry.is_manual ? 1 : 0,
      entry.billed_invoice_id,
      entry.notes,
      entry.id,
    ]
  );
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM time_entries WHERE id = ?', [id]);
}

export async function markTimeEntriesBilled(entryIds: string[], invoiceId: string): Promise<void> {
  const db = await getDatabase();
  for (const id of entryIds) {
    await db.runAsync('UPDATE time_entries SET billed_invoice_id = ? WHERE id = ?', [invoiceId, id]);
  }
}

// ==================== INVOICES ====================
export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Invoice>('SELECT * FROM invoices ORDER BY created_at DESC');
}

export async function getInvoiceCountForCurrentMonth(): Promise<number> {
  const db = await getDatabase();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM invoices WHERE created_at >= ?',
    [startOfMonth]
  );
  return result?.count || 0;
}

export async function getNextInvoiceNumber(): Promise<string> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM invoices');
  const count = (result?.count || 0) + 1;
  return `INV-${count.toString().padStart(3, '0')}`;
}

export async function getInvoiceWithItems(id: string): Promise<{ invoice: Invoice; items: InvoiceItem[] } | null> {
  const db = await getDatabase();
  const invoice = await db.getFirstAsync<Invoice>('SELECT * FROM invoices WHERE id = ?', [id]);
  if (!invoice) return null;

  const items = await db.getAllAsync<InvoiceItem>('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
  return { invoice, items };
}

export async function insertInvoice(
  invoice: Omit<Invoice, 'id' | 'created_at'>,
  items: Omit<InvoiceItem, 'id' | 'invoice_id'>[],
  associatedTimeEntryIds: string[] = []
): Promise<Invoice> {
  const db = await getDatabase();
  const newInvoice: Invoice = {
    ...invoice,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO invoices (id, invoice_number, client_id, status, issue_date, due_date, tax_percent, subtotal_cents, tax_cents, total_cents, notes, payment_instructions, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newInvoice.id,
      newInvoice.invoice_number,
      newInvoice.client_id,
      newInvoice.status,
      newInvoice.issue_date,
      newInvoice.due_date,
      newInvoice.tax_percent,
      newInvoice.subtotal_cents,
      newInvoice.tax_cents,
      newInvoice.total_cents,
      newInvoice.notes,
      newInvoice.payment_instructions,
      newInvoice.created_at,
    ]
  );

  for (const item of items) {
    const itemId = generateId();
    await db.runAsync(
      `INSERT INTO invoice_items (id, invoice_id, description, hours, rate_cents, amount_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, newInvoice.id, item.description, item.hours, item.rate_cents, item.amount_cents]
    );
  }

  if (associatedTimeEntryIds.length > 0) {
    await markTimeEntriesBilled(associatedTimeEntryIds, newInvoice.id);
  }

  return newInvoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDatabase();
  // Unbill time entries associated with this invoice
  await db.runAsync('UPDATE time_entries SET billed_invoice_id = NULL WHERE billed_invoice_id = ?', [id]);
  await db.runAsync('DELETE FROM invoices WHERE id = ?', [id]);
}

// ==================== USER SETTINGS ====================
export async function getUserSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const settings = await db.getFirstAsync<UserSettings>('SELECT * FROM user_settings WHERE id = 1');
  if (settings) return settings;

  return {
    business_name: 'My Freelance Business',
    business_email: '',
    business_address: '',
    tax_id: '',
    logo_uri: null,
    payment_instructions_default: 'Bank Transfer: Account #12345678\nPayPal: pay@me.com\nWise: wise@me.com',
  };
}

export async function updateUserSettings(settings: UserSettings): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE user_settings SET business_name = ?, business_email = ?, business_address = ?, tax_id = ?, logo_uri = ?, payment_instructions_default = ? WHERE id = 1`,
    [
      settings.business_name,
      settings.business_email,
      settings.business_address,
      settings.tax_id,
      settings.logo_uri,
      settings.payment_instructions_default,
    ]
  );
}
