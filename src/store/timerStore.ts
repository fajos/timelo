import { create } from 'zustand';
import { ActiveTimerState, TimeEntry } from '../types';
import { insertTimeEntry } from '../db/repository';

interface TimerStoreState {
  activeTimer: ActiveTimerState | null;
  elapsedSeconds: number;
  startTimer: (clientId: string, projectId: string, notes?: string) => void;
  stopTimer: () => Promise<TimeEntry | null>;
  cancelTimer: () => void;
  updateElapsed: () => void;
  setActiveTimer: (timer: ActiveTimerState | null) => void;
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  activeTimer: null,
  elapsedSeconds: 0,

  startTimer: (clientId: string, projectId: string, notes = '') => {
    const startTime = new Date().toISOString();
    const newTimer: ActiveTimerState = {
      id: Date.now().toString(),
      client_id: clientId,
      project_id: projectId,
      start_time: startTime,
      notes,
    };
    set({ activeTimer: newTimer, elapsedSeconds: 0 });
  },

  updateElapsed: () => {
    const { activeTimer } = get();
    if (!activeTimer) {
      set({ elapsedSeconds: 0 });
      return;
    }
    const startMs = new Date(activeTimer.start_time).getTime();
    const nowMs = Date.now();
    const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    set({ elapsedSeconds: diffSec });
  },

  stopTimer: async () => {
    const { activeTimer } = get();
    if (!activeTimer) return null;

    const endTime = new Date().toISOString();
    const startMs = new Date(activeTimer.start_time).getTime();
    const endMs = new Date(endTime).getTime();
    const durationSeconds = Math.max(1, Math.floor((endMs - startMs) / 1000));

    let newEntry: TimeEntry | null = null;
    try {
      newEntry = await insertTimeEntry({
        project_id: activeTimer.project_id || '',
        client_id: activeTimer.client_id || '',
        start_time: activeTimer.start_time,
        end_time: endTime,
        duration_seconds: durationSeconds,
        is_manual: false,
        billed_invoice_id: null,
        notes: activeTimer.notes || '',
      });
    } catch (e) {
      console.error('Error saving time entry on timer stop:', e);
    } finally {
      // Guarantee timer is cleared from Zustand state so timer UI stops
      set({ activeTimer: null, elapsedSeconds: 0 });
    }

    return newEntry;
  },

  cancelTimer: () => {
    set({ activeTimer: null, elapsedSeconds: 0 });
  },

  setActiveTimer: (timer: ActiveTimerState | null) => {
    set({ activeTimer: timer });
    get().updateElapsed();
  },
}));
