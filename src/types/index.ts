export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Client {
  id: string;
  name: string;
  email: string;
  hourly_rate_cents: number;
  currency: string; // e.g. 'USD', 'EUR', 'GBP', 'CAD', 'AUD'
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  client_id: string;
  start_time: string; // ISO string
  end_time: string | null; // ISO string or null if currently active
  duration_seconds: number;
  is_manual: boolean;
  billed_invoice_id: string | null;
  notes: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string; // Sequential & editable e.g. "INV-001"
  client_id: string;
  status: InvoiceStatus;
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  tax_percent: number; // e.g. 10 for 10%
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string;
  payment_instructions: string; // Bank, PayPal, Wise, etc.
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  hours: number;
  rate_cents: number;
  amount_cents: number;
}

export interface UserSettings {
  business_name: string;
  business_email: string;
  business_address: string;
  tax_id: string;
  logo_uri: string | null;
  payment_instructions_default: string;
}

export interface ActiveTimerState {
  id: string;
  project_id: string;
  client_id: string;
  start_time: string; // ISO string
  notes: string;
}
