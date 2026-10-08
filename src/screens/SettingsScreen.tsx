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
import { getUserSettings, updateUserSettings } from '../db/repository';
import { UserSettings } from '../types';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { exportTimeEntriesCsv, exportInvoicesCsv } from '../services/csvExport';
import { PaywallModal } from '../components/PaywallModal';

export const SettingsScreen: React.FC = () => {
  const { isPro } = useSubscriptionStore();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [logoUri, setLogoUri] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  const loadData = async () => {
    const s = await getUserSettings();
    setBusinessName(s.business_name || '');
    setBusinessEmail(s.business_email || '');
    setBusinessAddress(s.business_address || '');
    setTaxId(s.tax_id || '');
    setLogoUri(s.logo_uri || '');
    setPaymentInstructions(s.payment_instructions_default || '');
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    const updated: UserSettings = {
      business_name: businessName,
      business_email: businessEmail,
      business_address: businessAddress,
      tax_id: taxId,
      logo_uri: logoUri || null,
      payment_instructions_default: paymentInstructions,
    };

    await updateUserSettings(updated);
    Alert.alert('Settings Saved', 'Your business profile and payment details have been updated.');
  };

  const handleExportTimeEntries = async () => {
    if (!isPro) {
      setPaywallVisible(true);
      return;
    }
    try {
      await exportTimeEntriesCsv();
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Could not export time entries.');
    }
  };

  const handleExportInvoices = async () => {
    if (!isPro) {
      setPaywallVisible(true);
      return;
    }
    try {
      await exportInvoicesCsv();
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Could not export invoices.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Settings</Text>

        {/* Subscription Tier Banner */}
        <TouchableOpacity
          style={[styles.proCard, isPro && styles.proCardUnlocked]}
          onPress={() => setPaywallVisible(true)}
        >
          <View style={styles.proRow}>
            <Ionicons name="star" size={24} color={isPro ? '#10B981' : '#F59E0B'} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.proTitle}>{isPro ? 'Pro Subscription Active' : 'Free Tier'}</Text>
              <Text style={styles.proSub}>
                {isPro
                  ? 'Unlimited clients, clean PDFs & logo branding unlocked.'
                  : 'Upgrade for $5.99/mo or $39/year to unlock unlimited clients & clean PDFs.'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </View>
        </TouchableOpacity>

        {/* Business Profile */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Details for Invoices</Text>

          <Text style={styles.label}>Business / Freelancer Name</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. John Doe Consulting"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Business Email</Text>
          <TextInput
            style={styles.input}
            value={businessEmail}
            onChangeText={setBusinessEmail}
            keyboardType="email-address"
            placeholder="john@freelance.com"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Business Address</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            multiline
            value={businessAddress}
            onChangeText={setBusinessAddress}
            placeholder="123 Tech Street, San Francisco, CA"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Tax / VAT ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={taxId}
            onChangeText={setTaxId}
            placeholder="US123456789"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Logo Image URL (Pro)</Text>
          <TextInput
            style={styles.input}
            value={logoUri}
            onChangeText={setLogoUri}
            placeholder="https://example.com/my-logo.png"
          />

          <Text style={[styles.label, { marginTop: 10 }]}>Default Payment Instructions</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            multiline
            value={paymentInstructions}
            onChangeText={setPaymentInstructions}
            placeholder="Bank Details, PayPal, Wise, etc."
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Profile Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Local Data Export (Pro) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data Backup & Export (Pro)</Text>
          <Text style={styles.exportSub}>Export your data anytime to standard CSV files.</Text>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportTimeEntries}>
            <Ionicons name="document-text-outline" size={18} color="#2563EB" />
            <Text style={styles.exportBtnText}>Export Time Entries (CSV)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportInvoices}>
            <Ionicons name="receipt-outline" size={18} color="#2563EB" />
            <Text style={styles.exportBtnText}>Export Invoices (CSV)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason="Upgrade to Pro for unlimited clients, clean PDF invoices with your custom logo, and CSV data exports!"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  proCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  proCardUnlocked: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  proSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
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
  saveBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  exportSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  exportBtnText: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 10,
  },
});
