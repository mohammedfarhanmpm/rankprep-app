import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { scheduleAt, cancelRevision } from './reminders';

/** Personal planner data. Stored only on this phone (journal and wishlist are private). */
export type Todo = { id: string; text: string; done: boolean; time?: string };
export type Topic = { id: string; text: string; subject: string | null; date: string; done: boolean; doneAt?: string };
export type TargetCat = 'Study' | 'Health' | 'Personal';
export type Target = { id: string; text: string; cat: TargetCat; done: boolean };
export type Reminder = { id: string; title: string; date: string; note?: string; notif: string[] };
export type Wish = { id: string; text: string; price?: string; bought: boolean; boughtAt?: string };
export type Achievement = { id: string; title: string; date: string; emoji: string; note?: string };
export type Exercise = { id: string; text: string; min: number };
export type Health = { water: number; sleep?: number; exercise: Exercise[]; meals: string };
export type Journal = { text: string; emoji?: string };
/** A weekly timetable slot, e.g. 6:00–7:00 · Physics · HC Verma ch 5 */
export type Slot = { id: string; time: string; subject: string; what: string };

export type Planner = {
  todos: Record<string, Todo[]>;
  topics: Topic[];
  targets: Record<string, Target[]>; // key YYYY-MM
  reminders: Reminder[];
  wishes: Wish[];
  achievements: Achievement[];
  health: Record<string, Health>;
  journal: Record<string, Journal>;
  /** minutes of focus-timer study per day */
  focus: Record<string, number>;
  /** weekly timetable by weekday 0 (Sun) .. 6 (Sat) */
  timetable: Record<string, Slot[]>;
};

const EMPTY: Planner = { todos: {}, topics: [], targets: {}, reminders: [], wishes: [], achievements: [], health: {}, journal: {}, focus: {}, timetable: {} };
const KEY = 'rankprep-planner-v1';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const emptyHealth = (): Health => ({ water: 0, exercise: [], meals: '' });

type Ctx = {
  p: Planner;
  set: (fn: (p: Planner) => Planner) => void;
  addReminder: (r: Omit<Reminder, 'id' | 'notif'>) => void;
  removeReminder: (id: string) => void;
  addFocus: (day: string, minutes: number) => void;
};
const PlannerCtx = createContext<Ctx | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Planner>(EMPTY);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setP({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const set = useCallback((fn: (p: Planner) => Planner) => {
    setP((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const addReminder = useCallback(
    (r: Omit<Reminder, 'id' | 'notif'>) => {
      const id = uid();
      set((x) => ({ ...x, reminders: [...x.reminders, { ...r, id, notif: [] }].sort((a, b) => a.date.localeCompare(b.date)) }));
      // One day before at 6 pm, and on the day at 8 am.
      const at = new Date(r.date + 'T08:00:00');
      const before = new Date(at.getTime() - 14 * 3600e3);
      Promise.all([
        scheduleAt(`Tomorrow: ${r.title} 📅`, r.note || 'PIP reminder', before, 'reminders'),
        scheduleAt(`Today: ${r.title} 📅`, r.note || 'PIP reminder', at, 'reminders'),
      ]).then((ids) => set((x) => ({ ...x, reminders: x.reminders.map((m) => (m.id === id ? { ...m, notif: ids.filter(Boolean) as string[] } : m)) })));
    },
    [set],
  );

  const removeReminder = useCallback(
    (id: string) =>
      set((x) => {
        cancelRevision(x.reminders.find((r) => r.id === id)?.notif);
        return { ...x, reminders: x.reminders.filter((r) => r.id !== id) };
      }),
    [set],
  );

  const addFocus = useCallback((day: string, minutes: number) => set((x) => ({ ...x, focus: { ...x.focus, [day]: (x.focus[day] ?? 0) + minutes } })), [set]);

  return <PlannerCtx.Provider value={{ p, set, addReminder, removeReminder, addFocus }}>{children}</PlannerCtx.Provider>;
}

export function usePlanner(): Ctx {
  const v = useContext(PlannerCtx);
  if (!v) throw new Error('usePlanner outside PlannerProvider');
  return v;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftDay(day: string, n: number): string {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const z = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function prettyDay(day: string, today: string): string {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  if (day === shiftDay(today, 1)) return 'Tomorrow';
  return new Date(day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
