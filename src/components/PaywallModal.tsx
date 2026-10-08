import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../store/subscriptionStore';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ visible, onClose, reason }) => {
  const { purchaseMonthly, purchaseAnnual, restorePurchases, toggleProMock } = useSubscriptionStore();

  const handleMonthly = async () => {
    const success = await purchaseMonthly();
    if (success) {
      Alert.alert('Success!', 'Welcome to Pro!');
      onClose();
    }
  };

  const handleAnnual = async () => {
    const success = await purchaseAnnual();
    if (success) {
      Alert.alert('Success!', 'Welcome to Pro!');
      onClose();
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      onClose();
    } else {
      Alert.alert('Notice', 'No previous Pro subscription found.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.crownIcon}>
                <Ionicons name="star" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.title}>Upgrade to Pro</Text>
              <Text style={styles.subtitle}>
                {reason || 'Unlock unlimited clients, clean PDF invoices with custom logo, and CSV data export.'}
              </Text>
            </View>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Unlimited Clients & Invoices</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Clean PDF Invoices (Remove App Footer)</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>Custom Business Logo Branding</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.featureText}>CSV Local Data Export</Text>
              </View>
            </View>

            <View style={styles.pricingCards}>
              <TouchableOpacity style={[styles.card, styles.cardAnnual]} onPress={handleAnnual}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>BEST VALUE - SAVE 45%</Text>
                </View>
                <Text style={styles.cardTitle}>Annual Plan</Text>
                <Text style={styles.cardPrice}>$39.00 / year</Text>
                <Text style={styles.cardSubtext}>Just $3.25 / month</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.card} onPress={handleMonthly}>
                <Text style={styles.cardTitle}>Monthly Plan</Text>
                <Text style={styles.cardPrice}>$5.99 / month</Text>
                <Text style={styles.cardSubtext}>Cancel anytime</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.linkText}>Restore Purchases</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  toggleProMock();
                  Alert.alert('Dev Toggle', 'Toggled Pro tier for dev testing.');
                  onClose();
                }}
                style={{ marginTop: 12 }}
              >
                <Text style={[styles.linkText, { color: '#94A3B8', fontSize: 12 }]}>
                  [Dev Only] Quick Toggle Pro Tier
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  featureList: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 10,
  },
  pricingCards: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  cardAnnual: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  badge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footerActions: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
});
