import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllInvoices,
  getAllClients,
  getInvoiceWithItems,
  updateInvoiceStatus,
  deleteInvoice,
  getUserSettings,
} from '../db/repository';
import { Invoice, Client, InvoiceStatus } from '../types';
import { formatCurrency, generateAndShareInvoicePdf } from '../services/pdfService';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface InvoiceListScreenProps {
  navigation: any;
}

export const InvoiceListScreen: React.FC<InvoiceListScreenProps> = ({ navigation }) => {
  const { isPro } = useSubscriptionStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadData = async () => {
    const fetchedInvoices = await getAllInvoices();
    const fetchedClients = await getAllClients();
    setInvoices(fetchedInvoices);
    setClients(new Map(fetchedClients.map((c) => [c.id, c])));
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    loadData();
    return unsubscribe;
  }, [navigation]);

  const handleSharePdf = async (invoice: Invoice) => {
    try {
      const data = await getInvoiceWithItems(invoice.id);
      const client = clients.get(invoice.client_id);
      const settings = await getUserSettings();

      if (!data || !client) {
        Alert.alert('Error', 'Invoice details or client data missing.');
        return;
      }

      await generateAndShareInvoicePdf(invoice, data.items, client, settings, isPro);
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message || 'Could not render PDF.');
    }
  };

  const handleChangeStatus = (invoice: Invoice) => {
    Alert.alert('Update Status', `Change status for ${invoice.invoice_number}`, [
      { text: 'Draft', onPress: () => updateStatus(invoice.id, 'draft') },
      { text: 'Sent', onPress: () => updateStatus(invoice.id, 'sent') },
      { text: 'Paid', onPress: () => updateStatus(invoice.id, 'paid') },
      { text: 'Overdue', onPress: () => updateStatus(invoice.id, 'overdue') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const updateStatus = async (id: string, status: InvoiceStatus) => {
    await updateInvoiceStatus(id, status);
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Invoice', 'Deleting this invoice will return its time entries to unbilled. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteInvoice(id);
          loadData();
        },
      },
    ]);
  };

  const filteredInvoices = invoices.filter((i) => (filterStatus === 'all' ? true : i.status === filterStatus));

  const renderItem = ({ item }: { item: Invoice }) => {
    const client = clients.get(item.client_id);
    const statusBg =
      item.status === 'paid'
        ? '#D1FAE5'
        : item.status === 'overdue'
        ? '#FEE2E2'
        : item.status === 'sent'
        ? '#DBEAFE'
        : '#F1F5F9';

    const statusText =
      item.status === 'paid'
        ? '#065F46'
        : item.status === 'overdue'
        ? '#991B1B'
        : item.status === 'sent'
        ? '#1E40AF'
        : '#475569';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.invoiceNum}>{item.invoice_number}</Text>
            <Text style={styles.clientName}>{client?.name || 'Unknown Client'}</Text>
          </View>
          <TouchableOpacity onPress={() => handleChangeStatus(item)} style={[styles.badge, { backgroundColor: statusBg }]}>
            <Text style={[styles.badgeText, { color: statusText }]}>{item.status.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.amountText}>{formatCurrency(item.total_cents, client?.currency || 'USD')}</Text>
          <Text style={styles.dateText}>Due: {item.due_date}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => handleSharePdf(item)}>
            <Ionicons name="share-outline" size={16} color="#2563EB" />
            <Text style={styles.shareBtnText}>PDF & Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoices</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('InvoiceBuilder')}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>New Invoice</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, filterStatus === st && styles.filterChipActive]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && styles.filterChipTextActive]}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Invoices Found</Text>
            <Text style={styles.emptySub}>Tap "New Invoice" to pull unbilled time and generate a PDF.</Text>
          </View>
        }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  clientName: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
  },
  amountText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
