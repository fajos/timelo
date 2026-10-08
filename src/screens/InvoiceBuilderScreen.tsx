import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllClients,
  getUnbilledEntriesForClient,
  getNextInvoiceNumber,
  getUserSettings,
  insertInvoice,
  getInvoiceCountForCurrentMonth,
} from '../db/repository';
import { Client, TimeEntry, InvoiceItem } from '../types';
import { formatCurrency, generateAndShareInvoicePdf } from '../services/pdfService';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { PaywallModal } from '../components/PaywallModal';

interface InvoiceBuilderScreenProps {
  navigation: any;
}

export const InvoiceBuilderScreen: React.FC<InvoiceBuilderScreenProps> = ({ navigation }) => {
  const { isPro } = useSubscriptionStore();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [invoiceNumber, setInvoiceNumber] = useState<string>('INV-001');
  const [taxPercent, setTaxPercent] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentInstructions, setPaymentInstructions] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [unbilledEntries, setUnbilledEntries] = useState<TimeEntry[]>([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  const initData = async () => {
    // Paywall Check
    if (!isPro) {
      const monthCount = await getInvoiceCountForCurrentMonth();
      if (monthCount >= 3) {
        setPaywallVisible(true);
      }
    }

    const fetchedClients = await getAllClients();
    setClients(fetchedClients);

    const nextNum = await getNextInvoiceNumber();
    setInvoiceNumber(nextNum);

    const settings = await getUserSettings();
    setPaymentInstructions(settings.payment_instructions_default || '');

    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14); // 14 days net
    setDueDate(defaultDue.toISOString().split('T')[0]);

    if (fetchedClients.length > 0) {
      setSelectedClientId(fetchedClients[0].id);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      getUnbilledEntriesForClient(selectedClientId).then((entries) => {
        setUnbilledEntries(entries);
        setSelectedEntryIds(new Set(entries.map((e) => e.id)));
      });
    }
  }, [selectedClientId]);

  const toggleEntrySelection = (id: string) => {
    const newSet = new Set(selectedEntryIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedEntryIds(newSet);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Calculations
  const selectedEntries = unbilledEntries.filter((e) => selectedEntryIds.has(e.id));
  const subtotalCents = selectedEntries.reduce((acc, curr) => {
    const rate = selectedClient?.hourly_rate_cents || 0;
    const hours = curr.duration_seconds / 3600;
    return acc + Math.round(hours * rate);
  }, 0);

  const tax = parseFloat(taxPercent) || 0;
  const taxCents = Math.round((subtotalCents * tax) / 100);
  const totalCents = subtotalCents + taxCents;

  const handleCreateInvoice = async () => {
    if (!selectedClient) {
      Alert.alert('Client Required', 'Please select a client.');
      return;
    }
    if (selectedEntries.length === 0) {
      Alert.alert('Entries Required', 'Please select at least one unbilled time entry.');
      return;
    }

    const items: Omit<InvoiceItem, 'id' | 'invoice_id'>[] = selectedEntries.map((e) => {
      const hours = parseFloat((e.duration_seconds / 3600).toFixed(2));
      const rateCents = selectedClient.hourly_rate_cents;
      const amountCents = Math.round(hours * rateCents);
      return {
        description: e.notes || `Time tracked on ${new Date(e.start_time).toLocaleDateString()}`,
        hours,
        rate_cents: rateCents,
        amount_cents: amountCents,
      };
    });

    const issueDate = new Date().toISOString().split('T')[0];

    const newInvoice = await insertInvoice(
      {
        invoice_number: invoiceNumber,
        client_id: selectedClient.id,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate || issueDate,
        tax_percent: tax,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        notes,
        payment_instructions: paymentInstructions,
      },
      items,
      Array.from(selectedEntryIds)
    );

    const settings = await getUserSettings();

    Alert.alert('Invoice Created!', `Invoice ${newInvoice.invoice_number} saved. Generate PDF now?`, [
      { text: 'Later', onPress: () => navigation.goBack() },
      {
        text: 'Generate PDF & Share',
        onPress: async () => {
          await generateAndShareInvoicePdf(newInvoice, items as any, selectedClient, settings, isPro);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Builder</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Client Selection */}
        <View style={styles.card}>
          <Text style={styles.label}>1. Select Client</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {clients.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pill, selectedClientId === c.id && styles.pillActive]}
                onPress={() => setSelectedClientId(c.id)}
              >
                <Text style={[styles.pillText, selectedClientId === c.id && styles.pillTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Unbilled Time Entries Checklist */}
        <View style={styles.card}>
          <Text style={styles.label}>2. Unbilled Time Entries</Text>
          {unbilledEntries.length === 0 ? (
            <Text style={styles.emptyText}>No unbilled time entries found for this client.</Text>
          ) : (
            unbilledEntries.map((item) => {
              const isSelected = selectedEntryIds.has(item.id);
              const hours = (item.duration_seconds / 3600).toFixed(2);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.entryRow, isSelected && styles.entryRowSelected]}
                  onPress={() => toggleEntrySelection(item.id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? '#2563EB' : '#94A3B8'}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.entryNotes}>{item.notes || 'Time Entry'}</Text>
                    <Text style={styles.entrySub}>
                      {new Date(item.start_time).toLocaleDateString()} • {hours} hrs
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.card}>
          <Text style={styles.label}>3. Invoice Details</Text>

          <Text style={styles.subLabel}>Invoice Number</Text>
          <TextInput
            style={styles.input}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-001"
          />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Tax / VAT %</Text>
              <TextInput
                style={styles.input}
                value={taxPercent}
                onChangeText={setTaxPercent}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.subLabel}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Text style={[styles.subLabel, { marginTop: 10 }]}>Payment Instructions (Bank, Wise, PayPal)</Text>
          <TextInput
            style={[styles.input, { height: 70 }]}
            multiline
            value={paymentInstructions}
            onChangeText={setPaymentInstructions}
          />

          <Text style={[styles.subLabel, { marginTop: 10 }]}>Invoice Notes</Text>
          <TextInput
            style={styles.input}
            placeholder="Thank you for your business!"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Totals Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(subtotalCents, selectedClient?.currency || 'USD')}
            </Text>
          </View>
          {tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({tax}%):</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(taxCents, selectedClient?.currency || 'USD')}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: '#E2E8F0', paddingTop: 8 }]}>
            <Text style={styles.totalLabel}>Total Due:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totalCents, selectedClient?.currency || 'USD')}
            </Text>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreateInvoice}>
            <Text style={styles.submitBtnText}>Save & Generate Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => {
          setPaywallVisible(false);
          navigation.goBack();
        }}
        reason="Free plan includes 3 invoices per month. Upgrade to Pro for unlimited invoices!"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  pillRow: {
    flexDirection: 'row',
  },
  pill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#2563EB',
  },
  pillText: {
    color: '#475569',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  entryRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  entryNotes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  entrySub: {
    fontSize: 12,
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
