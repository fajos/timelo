import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllClients,
  insertClient,
  deleteClient,
  getProjectsByClient,
  insertProject,
} from '../db/repository';
import { Client, Project } from '../types';
import { formatCurrency } from '../services/pdfService';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { PaywallModal } from '../components/PaywallModal';

export const ClientsScreen: React.FC = () => {
  const { isPro } = useSubscriptionStore();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientProjects, setClientProjects] = useState<Map<string, Project[]>>(new Map());

  // Add Client Modal
  const [addClientModal, setAddClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [currency, setCurrency] = useState('USD');

  // Add Project Modal
  const [addProjectModal, setAddProjectModal] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string>('');
  const [projectName, setProjectName] = useState('');

  const loadData = async () => {
    const fetchedClients = await getAllClients();
    setClients(fetchedClients);

    const projectMap = new Map<string, Project[]>();
    for (const c of fetchedClients) {
      const p = await getProjectsByClient(c.id);
      projectMap.set(c.id, p);
    }
    setClientProjects(projectMap);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddClient = () => {
    if (!isPro && clients.length >= 2) {
      setPaywallVisible(true);
      return;
    }
    setAddClientModal(true);
  };

  const handleSaveClient = async () => {
    if (!clientName.trim()) {
      Alert.alert('Name Required', 'Please enter a client name.');
      return;
    }

    const rateNum = parseFloat(hourlyRate) || 0;
    const rateCents = Math.round(rateNum * 100);

    await insertClient({
      name: clientName.trim(),
      email: clientEmail.trim(),
      hourly_rate_cents: rateCents,
      currency,
    });

    setClientName('');
    setClientEmail('');
    setHourlyRate('50');
    setAddClientModal(false);
    loadData();
  };

  const handleSaveProject = async () => {
    if (!projectName.trim() || !activeClientId) return;

    await insertProject({
      client_id: activeClientId,
      name: projectName.trim(),
      color: '#3B82F6',
    });

    setProjectName('');
    setAddProjectModal(false);
    loadData();
  };

  const handleDeleteClient = (id: string, name: string) => {
    Alert.alert('Delete Client', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteClient(id);
          loadData();
        },
      },
    ]);
  };

  const renderClientItem = ({ item }: { item: Client }) => {
    const projects = clientProjects.get(item.id) || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientEmail}>{item.email || 'No email provided'}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteClient(item.id, item.name)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.rateBadge}>
          <Text style={styles.rateText}>
            {formatCurrency(item.hourly_rate_cents, item.currency)} / hour
          </Text>
        </View>

        <View style={styles.projectSection}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle}>Projects ({projects.length})</Text>
            <TouchableOpacity
              onPress={() => {
                setActiveClientId(item.id);
                setAddProjectModal(true);
              }}
            >
              <Text style={styles.addProjectLink}>+ Add Project</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.projectPillContainer}>
            {projects.map((p) => (
              <View key={p.id} style={styles.projectPill}>
                <Text style={styles.projectPillText}>{p.name}</Text>
              </View>
            ))}
            {projects.length === 0 && (
              <Text style={styles.noProjectsText}>No projects created under this client yet.</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddClient}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Client</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClientItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Clients Added</Text>
            <Text style={styles.emptySub}>Add your first client to start tracking time and billing.</Text>
          </View>
        }
      />

      {/* Add Client Modal */}
      <Modal visible={addClientModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Client</Text>

            <Text style={styles.label}>Client / Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Acme Corp"
              value={clientName}
              onChangeText={setClientName}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="billing@acme.com"
              keyboardType="email-address"
              value={clientEmail}
              onChangeText={setClientEmail}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hourly Rate ($/€/£)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Currency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 4 }}>
                  {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((curr) => (
                    <TouchableOpacity
                      key={curr}
                      style={[styles.currChip, currency === curr && styles.currChipActive]}
                      onPress={() => setCurrency(curr)}
                    >
                      <Text style={[styles.currText, currency === curr && styles.currTextActive]}>
                        {curr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddClientModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveClient}>
                <Text style={styles.saveBtnText}>Save Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Project Modal */}
      <Modal visible={addProjectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Project</Text>

            <Text style={styles.label}>Project Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mobile App Redesign"
              value={projectName}
              onChangeText={setProjectName}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddProjectModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProject}>
                <Text style={styles.saveBtnText}>Save Project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        reason="Free tier allows up to 2 clients. Upgrade to Pro for unlimited clients!"
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
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
  clientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  clientEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  rateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  rateText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 12,
  },
  projectSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  addProjectLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  projectPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  projectPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectPillText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  noProjectsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
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
    marginBottom: 16,
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
  currChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 6,
  },
  currChipActive: {
    backgroundColor: '#2563EB',
  },
  currText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  currTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
