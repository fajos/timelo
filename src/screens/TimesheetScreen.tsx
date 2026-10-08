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
import { getAllTimeEntries, deleteTimeEntry, getAllClients } from '../db/repository';
import { TimeEntry, Client } from '../types';

export const TimesheetScreen: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Map<string, Client>>(new Map());

  const loadData = async () => {
    const fetchedEntries = await getAllTimeEntries();
    const fetchedClients = await getAllClients();
    const clientMap = new Map(fetchedClients.map((c) => [c.id, c]));

    setEntries(fetchedEntries);
    setClients(clientMap);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this time entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTimeEntry(id);
          loadData();
        },
      },
    ]);
  };

  const totalHours = (entries.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 3600).toFixed(1);
  const unbilledHours = (
    entries.filter((e) => !e.billed_invoice_id).reduce((acc, curr) => acc + curr.duration_seconds, 0) / 3600
  ).toFixed(1);

  const renderItem = ({ item }: { item: TimeEntry }) => {
    const client = clients.get(item.client_id);
    const durationHours = (item.duration_seconds / 3600).toFixed(2);
    const startDateStr = new Date(item.start_time).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.clientName}>{client?.name || 'Unknown Client'}</Text>
            <Text style={styles.dateText}>{startDateStr}</Text>
          </View>
          <View
            style={[
              styles.badge,
              item.billed_invoice_id ? styles.badgeBilled : styles.badgeUnbilled,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                item.billed_invoice_id ? styles.badgeTextBilled : styles.badgeTextUnbilled,
              ]}
            >
              {item.billed_invoice_id ? 'BILLED' : 'UNBILLED'}
            </Text>
          </View>
        </View>

        {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}

        <View style={styles.cardFooter}>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={16} color="#64748B" />
            <Text style={styles.durationText}>{durationHours} hrs</Text>
            {item.is_manual ? <Text style={styles.manualTag}>(Manual)</Text> : null}
          </View>

          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timesheets</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalHours}h</Text>
          <Text style={styles.statLabel}>Total Tracked</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={[styles.statNumber, { color: '#2563EB' }]}>{unbilledHours}h</Text>
          <Text style={styles.statLabel}>Ready to Bill</Text>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Time Entries Yet</Text>
            <Text style={styles.emptySub}>Start the timer or add a manual entry to track time.</Text>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeUnbilled: {
    backgroundColor: '#EFF6FF',
  },
  badgeBilled: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextUnbilled: {
    color: '#2563EB',
  },
  badgeTextBilled: {
    color: '#64748B',
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 6,
  },
  manualTag: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
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
});
