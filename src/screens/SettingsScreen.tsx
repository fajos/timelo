import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getUserSettings, updateUserSettings } from '../db/repository';
import { UserSettings } from '../types';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { exportTimeEntriesCsv, exportInvoicesCsv } from '../services/csvExport';
import { PaywallModal } from '../components/PaywallModal';

export const SettingsScreen: React.FC = () => {
  const { isPro } = useSubscriptionStore();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string>('');
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

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

  const handlePickLogo = async () => {
    if (!isPro) {
      setPaywallReason('Custom business logo on invoices requires Timelo Pro.');
      setPaywallVisible(true);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (logoUri.trim() && !isPro) {
      setPaywallReason('Custom business logo on invoices is a Timelo Pro feature.');
      setPaywallVisible(true);
      return;
    }

    const updated: UserSettings = {
      business_name: businessName,
      business_email: businessEmail,
      business_address: businessAddress,
      tax_id: taxId,
      logo_uri: isPro ? logoUri : null,
      payment_instructions_default: paymentInstructions,
    };

    await updateUserSettings(updated);
    Alert.alert('Settings Saved', 'Your business profile details have been updated.');
  };

  const handleExportTimeEntries = async () => {
    if (!isPro) {
      setPaywallReason('CSV data export is a Timelo Pro feature. Upgrade to export your timesheets!');
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
      setPaywallReason('CSV data export is a Timelo Pro feature. Upgrade to export your invoices!');
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
          onPress={() => {
            setPaywallReason('Upgrade to Timelo Pro for unlimited clients, clean PDFs & logo branding!');
            setPaywallVisible(true);
          }}
        >
          <View style={styles.proRow}>
            <Ionicons name="star" size={24} color={isPro ? '#10B981' : '#F59E0B'} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.proTitle}>{isPro ? 'Timelo Pro Active' : 'Free Tier'}</Text>
              <Text style={styles.proSub}>
                {isPro
                  ? 'Unlimited clients, clean PDFs & logo branding unlocked.'
                  : 'Upgrade for $5.99/mo or $39/year for unlimited clients, clean PDFs, and CSV exports.'}
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

          {/* Logo Picker Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <Text style={styles.label}>Business Logo (Pro)</Text>
            {!isPro && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={10} color="#B45309" />
                <Text style={styles.lockBadgeText}>PRO ONLY</Text>
              </View>
            )}
          </View>

          <View style={styles.logoPickerContainer}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="image-outline" size={28} color="#94A3B8" />
                <Text style={styles.logoPlaceholderText}>No logo selected</Text>
              </View>
            )}

            <TouchableOpacity style={styles.pickLogoBtn} onPress={handlePickLogo}>
              <Ionicons name="cloud-upload-outline" size={16} color="#2563EB" />
              <Text style={styles.pickLogoBtnText}>{logoUri ? 'Change Logo' : 'Upload Logo'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Default Payment Instructions</Text>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle}>Data Export (CSV)</Text>
            {!isPro && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={10} color="#B45309" />
                <Text style={styles.lockBadgeText}>PRO ONLY</Text>
              </View>
            )}
          </View>
          <Text style={styles.exportSub}>Export your timesheet and invoice records into standard CSV files.</Text>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportTimeEntries}>
            <Ionicons name="document-text-outline" size={18} color="#2563EB" />
            <Text style={styles.exportBtnText}>Export Time Entries (CSV)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExportInvoices}>
            <Ionicons name="receipt-outline" size={18} color="#2563EB" />
            <Text style={styles.exportBtnText}>Export Invoices (CSV)</Text>
          </TouchableOpacity>
        </View>

        {/* Legal & Privacy Policy Link */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal & Privacy</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={() => setPrivacyModalVisible(true)}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" />
            <Text style={styles.exportBtnText}>Privacy Policy & Terms</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason={paywallReason || 'Upgrade to Timelo Pro for unlimited clients, clean PDF invoices with custom logo, and CSV data exports!'}
      />

      {/* Privacy Policy Modal */}
      <Modal visible={privacyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Privacy Policy & Terms</Text>
            <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
              <Text style={styles.privacyText}>
                <strong>Timelo Privacy Policy</strong>{'\n\n'}
                1. <strong>Local Data Storage</strong>: Timelo stores all client details, projects, timesheets, and invoice records locally on your device using encrypted SQLite database storage. We do not collect or transmit your client data to any external server.{'\n\n'}
                2. <strong>Subscriptions</strong>: In-app purchases are processed securely through RevenueCat, Apple App Store, and Google Play Billing. No payment credentials or credit card numbers are stored by Timelo.{'\n\n'}
                3. <strong>Permissions</strong>: Gallery access is requested solely when you choose to upload a custom business logo for your invoice header.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={() => setPrivacyModalVisible(false)}>
              <Text style={styles.saveBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 3,
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
  logoPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  logoPreview: {
    width: 80,
    height: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 40,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 9,
    color: '#64748B',
  },
  pickLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickLogoBtnText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
});
