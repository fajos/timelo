import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTimerStore } from '../store/timerStore';
import { getAllClients, getProjectsByClient, insertTimeEntry } from '../db/repository';
import { Client, Project } from '../types';

export const TimerScreen: React.FC = () => {
  const { activeTimer, elapsedSeconds, startTimer, stopTimer, updateElapsed } = useTimerStore();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [timerNotes, setTimerNotes] = useState<string>('');

  // Manual Entry Modal
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualHours, setManualHours] = useState('1');
  const [manualMinutes, setManualMinutes] = useState('0');
  const [manualNotes, setManualNotes] = useState('');

  const loadData = async () => {
    const fetchedClients = await getAllClients();
    setClients(fetchedClients);
    if (fetchedClients.length > 0 && !selectedClientId) {
      setSelectedClientId(fetchedClients[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      getProjectsByClient(selectedClientId).then((p) => {
        setProjects(p);
        if (p.length > 0) setSelectedProjectId(p[0].id);
        else setSelectedProjectId('');
      });
    }
  }, [selectedClientId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTimer) {
      updateElapsed();
      interval = setInterval(() => {
        updateElapsed();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = async () => {
    if (activeTimer) {
      const entry = await stopTimer();
      setTimerNotes('');
      Alert.alert('Time Entry Saved!', `Logged ${(entry?.duration_seconds || 0) / 60} minutes.`);
    } else {
      if (!selectedClientId) {
        Alert.alert('Client Required', 'Please add or select a client first.');
        return;
      }
      startTimer(selectedClientId, selectedProjectId, timerNotes);
    }
  };

  const handleSaveManualEntry = async () => {
    if (!selectedClientId) {
      Alert.alert('Client Required', 'Please select a client.');
      return;
    }
    const hrs = parseFloat(manualHours) || 0;
    const mins = parseFloat(manualMinutes) || 0;
    const durationSeconds = Math.max(60, Math.floor(hrs * 3600 + mins * 60));

    const now = new Date();
    const startTime = new Date(now.getTime() - durationSeconds * 1000).toISOString();

    await insertTimeEntry({
      client_id: selectedClientId,
      project_id: selectedProjectId,
      start_time: startTime,
      end_time: now.toISOString(),
      duration_seconds: durationSeconds,
      is_manual: true,
      billed_invoice_id: null,
      notes: manualNotes,
    });

    setManualModalVisible(false);
    setManualNotes('');
    Alert.alert('Success', 'Manual time entry created.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timer</Text>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setManualModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#2563EB" />
            <Text style={styles.manualButtonText}>Manual Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Client & Project Selectors */}
        <View style={styles.card}>
          <Text style={styles.label}>Select Client</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsContainer}>
            {clients.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.pill,
                  selectedClientId === c.id && styles.pillActive,
                ]}
                onPress={() => setSelectedClientId(c.id)}
                disabled={Boolean(activeTimer)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedClientId === c.id && styles.pillTextActive,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
            {clients.length === 0 && (
              <Text style={styles.emptyText}>No clients yet. Go to Clients tab to add one.</Text>
            )}
          </ScrollView>

          {projects.length > 0 && (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>Select Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsContainer}>
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.pill,
                      selectedProjectId === p.id && styles.pillActive,
                    ]}
                    onPress={() => setSelectedProjectId(p.id)}
                    disabled={Boolean(activeTimer)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        selectedProjectId === p.id && styles.pillTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <TextInput
            style={styles.notesInput}
            placeholder="What are you working on? (Optional notes)"
            placeholderTextColor="#94A3B8"
            value={timerNotes}
            onChangeText={setTimerNotes}
            editable={!activeTimer}
          />
        </View>

        {/* Timer Counter display */}
        <View style={styles.timerDisplayCard}>
          <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
          <Text style={styles.timerStatus}>
            {activeTimer ? 'TIMER RUNNING (Survives app close)' : 'READY TO TRACK'}
          </Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              activeTimer ? styles.stopButton : styles.startButton,
            ]}
            onPress={handleToggleTimer}
          >
            <Ionicons
              name={activeTimer ? 'square' : 'play'}
              size={32}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Manual Entry Modal */}
      <Modal visible={manualModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Manual Entry</Text>

            <View style={styles.rowInput}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Hours</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={manualHours}
                  onChangeText={setManualHours}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>Minutes</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="Work completed notes..."
              value={manualNotes}
              onChangeText={setManualNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveManualEntry}>
                <Text style={styles.saveBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  manualButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pillsContainer: {
    flexDirection: 'row',
    marginBottom: 10,
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
    fontSize: 13,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    marginTop: 10,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  timerDisplayCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 1,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
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
  rowInput: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
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
