import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Board, EXAMS, Exam, SYLLABUS, Subject } from './data';
import { cancelRevision, REVISION_DAYS, scheduleRevision } from './reminders';
import { supabase } from './supabase';

export type Tally = { correct: number; total: number };

export type Attempt = {
  id: string;
  exam: Exam;
  label: string;
  marks: number;
  max: number;
  correct: number;
  wrong: number;
  skipped: number;
  bySubject: Record<string, Tally>;
  /** key: "Subject|chapterIndex" */
  byChapter: Record<string, Tally>;
  createdAt: string;
};

type Done = Partial<Record<Subject, number[]>>;
/** Questions answered per local day, key YYYY-MM-DD. */
type Activity = Record<string, number>;
type Stats = { xp: number; activity: Activity; dailyGoal: number };

export type MistakeTag = 'silly' | 'concept' | 'time';
export type Mistake = { qid: string; at: string; tag?: MistakeTag };
export type Mood = 'great' | 'good' | 'okay' | 'tired' | 'stressed' | 'sick';
export type HeatColor = 'green' | 'yellow' | 'red';
/** When a chapter was finished, and how many of its 3/7/21-day revisions are done. */
type Learned = Record<string, { at: string; rev: number; notif: string[] }>;
export type DueRevision = { key: string; subject: Subject; chapter: number; name: string; day: number };

export type WeakChapter = { subject: Subject; chapter: number; name: string; pct: number; total: number };

type State = {
  ready: boolean;
  session: Session | null;
  guest: boolean;
  cloudEnabled: boolean;
  exam: Exam;
  board: Board | null;
  /** class/board chosen on first launch */
  onboarded: boolean;
  examDate: string;
  done: Done;
  attempts: Attempt[];
  xp: number;
  level: number;
  levelPct: number;
  streak: number;
  today: number;
  dailyGoal: number;
  weak: WeakChapter[];
  /** questions answered on a day (YYYY-MM-DD) */
  answeredOn: (day: string) => number;
  goalBase: number;
  mood: Mood | null;
  moods: Record<string, Mood>;
  mistakes: Mistake[];
  due: DueRevision[];
  heat: (s: Subject, ch: number) => { color: HeatColor; pct: number | null; due: boolean };
  setMood: (m: Mood) => void;
  addMistake: (qid: string) => void;
  tagMistake: (qid: string, tag: MistakeTag | undefined) => void;
  removeMistake: (qid: string) => void;
  markRevised: (key: string) => void;
  setExam: (e: Exam) => void;
  setTrack: (e: Exam, b: Board | null) => void;
  setExamDate: (d: string) => void;
  setDailyGoal: (n: number) => void;
  toggleChapter: (s: Subject, i: number) => void;
  recordAnswer: (correct: boolean) => void;
  addAttempt: (a: Omit<Attempt, 'id' | 'createdAt'>) => void;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<State | null>(null);
const K = 'rankprep-v1';
export const XP_PER_LEVEL = 500;

type Local = {
  /** data version: 2 = imported question bank (new chapter lists) */
  v: number;
  exam: Exam; board: Board | null; onboarded: boolean; examDate: Partial<Record<Exam, string>>; done: Done; attempts: Attempt[]; guest: boolean; stats: Stats;
  mistakes: Mistake[]; moods: Record<string, Mood>; learned: Learned;
};
const DATA_VERSION = 3;
const empty: Local = {
  v: DATA_VERSION,
  exam: 'JEE',
  board: null,
  onboarded: false, examDate: {}, done: {}, attempts: [], guest: false, stats: { xp: 0, activity: {}, dailyGoal: 20 },
  mistakes: [], moods: {}, learned: {},
};
const LOW_MOODS: Mood[] = ['tired', 'stressed'];

function chapterAccuracy(attempts: Attempt[]): Record<string, Tally> {
  const agg: Record<string, Tally> = {};
  attempts.forEach((a) =>
    Object.entries(a.byChapter ?? {}).forEach(([k, v]) => {
      const t = (agg[k] ??= { correct: 0, total: 0 });
      t.correct += v.correct;
      t.total += v.total;
    }),
  );
  return agg;
}

function computeDue(learned: Learned): DueRevision[] {
  const now = Date.now();
  return Object.entries(learned)
    .filter(([, v]) => v.rev < REVISION_DAYS.length && new Date(v.at).getTime() + REVISION_DAYS[v.rev] * 864e5 <= now)
    .map(([key, v]) => {
      const [subject, ch] = key.split('|') as [Subject, string];
      return { key, subject, chapter: +ch, name: SYLLABUS[subject]?.[+ch] ?? key, day: REVISION_DAYS[v.rev] };
    });
}

export function dayKey(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** Consecutive days with at least one answered question, ending today (or yesterday if today is not started yet). */
function computeStreak(activity: Activity): number {
  const d = new Date();
  if (!activity[dayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (activity[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function computeWeak(attempts: Attempt[]): WeakChapter[] {
  const agg: Record<string, Tally> = {};
  attempts.forEach((a) =>
    Object.entries(a.byChapter ?? {}).forEach(([k, v]) => {
      const t = (agg[k] ??= { correct: 0, total: 0 });
      t.correct += v.correct;
      t.total += v.total;
    }),
  );
  return Object.entries(agg)
    .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.6)
    .map(([k, v]) => {
      const [subject, ch] = k.split('|') as [Subject, string];
      return { subject, chapter: +ch, name: SYLLABUS[subject]?.[+ch] ?? k, pct: Math.round((v.correct / v.total) * 100), total: v.total };
    })
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [local, setLocal] = useState<Local>(empty);

  // Persist every change on device (works offline and in guest mode).
  const update = useCallback((fn: (l: Local) => Local) => {
    setLocal((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(K, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(K);
        if (raw) {
          const p = JSON.parse(raw);
          // Users from before class selection had already picked JEE or NEET.
          let l: Local = { ...empty, ...p, onboarded: p.onboarded ?? !!p.exam, board: p.board ?? null, stats: { ...empty.stats, ...p.stats }, learned: p.learned ?? {}, mistakes: p.mistakes ?? [], moods: p.moods ?? {} };
          if ((p.v ?? 1) === 2) {
            // v3 replaced the 13 sample Biology chapters with the 33 NCERT chapters: reset Biology progress only.
            const learned = Object.fromEntries(Object.entries(l.learned).filter(([k]) => !k.startsWith('Biology|')));
            Object.entries(l.learned).forEach(([k, x]) => k.startsWith('Biology|') && cancelRevision(x.notif));
            l = {
              ...l, v: DATA_VERSION, learned, done: { ...l.done, Biology: [] }, mistakes: l.mistakes.filter((m) => !/^B\d/.test(m.qid)),
              attempts: l.attempts.map((a) => ({ ...a, byChapter: Object.fromEntries(Object.entries(a.byChapter ?? {}).filter(([k]) => !k.startsWith('Biology|'))) })),
            };
            AsyncStorage.setItem(K, JSON.stringify(l)).catch(() => {});
          } else if ((p.v ?? 1) < DATA_VERSION) {
            // v1 had short sample chapter lists. Chapter indices and question ids changed with the
            // imported bank, so per-chapter progress is reset; XP, streak, moods and scores are kept.
            Object.values(l.learned).forEach((x) => cancelRevision(x.notif));
            l = { ...l, v: DATA_VERSION, done: {}, learned: {}, mistakes: [], attempts: l.attempts.map((a) => ({ ...a, byChapter: {} })) };
            AsyncStorage.setItem(K, JSON.stringify(l)).catch(() => {});
          }
          setLocal(l);
        }
      } catch {}
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      }
      setReady(true);
    })();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Pull cloud data after login; cloud wins over the device copy, XP and activity are merged.
  const uid = session?.user.id;
  useEffect(() => {
    if (!supabase || !uid) return;
    (async () => {
      const [p, s, a] = await Promise.all([
        supabase.from('rp_profiles').select('exam, board, exam_dates, stats').eq('id', uid).maybeSingle(),
        supabase.from('rp_syllabus').select('subject, chapter').eq('user_id', uid),
        supabase.from('rp_attempts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
      ]);
      update((l) => {
        const done: Done = {};
        (s.data ?? []).forEach((r: { subject: Subject; chapter: number }) => (done[r.subject] = [...(done[r.subject] ?? []), r.chapter]));
        const cs: Partial<Stats> = p.data?.stats ?? {};
        const activity = { ...(cs.activity ?? {}) };
        Object.entries(l.stats.activity).forEach(([d, n]) => (activity[d] = Math.max(activity[d] ?? 0, n)));
        return {
          ...l,
          guest: false,
          exam: (p.data?.exam as Exam) ?? l.exam,
          board: (p.data?.board as Board) ?? l.board,
          onboarded: l.onboarded || !!p.data?.exam,
          examDate: { ...l.examDate, ...(p.data?.exam_dates ?? {}) },
          done: s.data ? done : l.done,
          stats: { xp: Math.max(cs.xp ?? 0, l.stats.xp), dailyGoal: cs.dailyGoal ?? l.stats.dailyGoal, activity },
          mistakes: (cs as { mistakes?: Mistake[] }).mistakes ?? l.mistakes,
          moods: { ...((cs as { moods?: Record<string, Mood> }).moods ?? {}), ...l.moods },
          attempts: a.data
            ? a.data.map((r) => ({
                id: r.id, exam: r.exam, label: r.label ?? 'Mixed test', marks: r.marks, max: r.max, correct: r.correct, wrong: r.wrong,
                skipped: r.skipped, bySubject: r.by_subject ?? {}, byChapter: r.by_chapter ?? {}, createdAt: r.created_at,
              }))
            : l.attempts,
        };
      });
    })().catch(() => {});
  }, [uid, update]);

  const saveProfile = useCallback(
    (l: Local) => {
      if (supabase && uid) supabase.from('rp_profiles').upsert({ id: uid, exam: l.exam, board: l.board, exam_dates: l.examDate, stats: { ...l.stats, mistakes: l.mistakes, moods: l.moods } }).then(() => {});
    },
    [uid],
  );

  const value = useMemo<State>(() => {
    const xp = local.stats.xp;
    const mood = local.moods[dayKey()] ?? null;
    const acc = chapterAccuracy(local.attempts);
    const due = computeDue(local.learned);
    const dueKeys = new Set(due.map((d) => d.key));
    const mut = (fn: (l: Local) => Local) => update((l) => { const n = fn(l); saveProfile(n); return n; });
    return {
      ready,
      session,
      guest: local.guest,
      cloudEnabled: !!supabase,
      exam: local.exam,
      board: local.board,
      onboarded: local.onboarded,
      examDate: local.examDate[local.exam] ?? EXAMS[local.exam].defaultDate,
      done: local.done,
      attempts: local.attempts,
      xp,
      level: Math.floor(xp / XP_PER_LEVEL) + 1,
      levelPct: ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100,
      streak: computeStreak(local.stats.activity),
      today: local.stats.activity[dayKey()] ?? 0,
      goalBase: local.stats.dailyGoal,
      // A stressed or tired day gets half the target.
      // A sick day pauses the goal; a stressed or tired day halves it.
      dailyGoal: mood === 'sick' ? 0 : mood && LOW_MOODS.includes(mood) ? Math.ceil(local.stats.dailyGoal / 2) : local.stats.dailyGoal,
      mood,
      moods: local.moods,
      mistakes: local.mistakes,
      due,
      heat: (s, ch) => {
        const k = `${s}|${ch}`;
        const t = acc[k];
        const pct = t && t.total ? Math.round((t.correct / t.total) * 100) : null;
        const ticked = (local.done[s] ?? []).includes(ch);
        const isDue = dueKeys.has(k);
        let color: HeatColor = 'red';
        if (ticked) color = isDue || (pct != null && pct < 60) ? 'yellow' : 'green';
        else if (pct != null) color = pct >= 60 ? 'yellow' : 'red';
        return { color, pct, due: isDue };
      },
      setMood: (m) => mut((l) => ({ ...l, moods: { ...l.moods, [dayKey()]: m } })),
      addMistake: (qid) => mut((l) => (l.mistakes.some((x) => x.qid === qid) ? l : { ...l, mistakes: [{ qid, at: new Date().toISOString() }, ...l.mistakes].slice(0, 300) })),
      tagMistake: (qid, tag) => mut((l) => ({ ...l, mistakes: l.mistakes.map((x) => (x.qid === qid ? { ...x, tag } : x)) })),
      removeMistake: (qid) => mut((l) => ({ ...l, mistakes: l.mistakes.filter((x) => x.qid !== qid) })),
      markRevised: (key) => update((l) => (l.learned[key] ? { ...l, learned: { ...l.learned, [key]: { ...l.learned[key], rev: l.learned[key].rev + 1 } } } : l)),
      answeredOn: (d) => local.stats.activity[d] ?? 0,
      weak: computeWeak(local.attempts.filter((a) => a.exam === local.exam)),
      setExam: (exam) => update((l) => { const n = { ...l, exam }; saveProfile(n); return n; }),
      setTrack: (exam, board) => update((l) => { const n = { ...l, exam, board, onboarded: true }; saveProfile(n); return n; }),
      setExamDate: (d) => update((l) => { const n = { ...l, examDate: { ...l.examDate, [l.exam]: d } }; saveProfile(n); return n; }),
      setDailyGoal: (g) => update((l) => { const n = { ...l, stats: { ...l.stats, dailyGoal: g } }; saveProfile(n); return n; }),
      toggleChapter: (subject, chapter) =>
        update((l) => {
          const cur = new Set(l.done[subject] ?? []);
          const on = !cur.has(chapter);
          on ? cur.add(chapter) : cur.delete(chapter);
          const key = `${subject}|${chapter}`;
          const learned = { ...l.learned };
          if (on) {
            learned[key] = { at: new Date().toISOString(), rev: 0, notif: [] };
            scheduleRevision(SYLLABUS[subject][chapter], subject).then((ids) =>
              update((x) => (x.learned[key] ? { ...x, learned: { ...x.learned, [key]: { ...x.learned[key], notif: ids } } } : x)),
            );
          } else {
            cancelRevision(learned[key]?.notif);
            delete learned[key];
          }
          if (supabase && uid) {
            const t = supabase.from('rp_syllabus');
            (on ? t.upsert({ user_id: uid, subject, chapter }) : t.delete().match({ user_id: uid, subject, chapter })).then(() => {});
          }
          return { ...l, learned, done: { ...l.done, [subject]: [...cur] } };
        }),
      // +2 XP for every answer, +10 more if correct.
      recordAnswer: (correct) =>
        update((l) => {
          const k = dayKey();
          const n = { ...l, stats: { ...l.stats, xp: l.stats.xp + 2 + (correct ? 10 : 0), activity: { ...l.stats.activity, [k]: (l.stats.activity[k] ?? 0) + 1 } } };
          saveProfile(n);
          return n;
        }),
      addAttempt: (a) => {
        const full: Attempt = { ...a, id: String(Date.now()), createdAt: new Date().toISOString() };
        update((l) => ({ ...l, attempts: [full, ...l.attempts].slice(0, 50) }));
        if (supabase && uid)
          supabase.from('rp_attempts').insert({
            user_id: uid, exam: a.exam, label: a.label, marks: a.marks, max: a.max, correct: a.correct, wrong: a.wrong, skipped: a.skipped,
            by_subject: a.bySubject, by_chapter: a.byChapter,
          }).then(() => {});
      },
      continueAsGuest: () => update((l) => ({ ...l, guest: true })),
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
        update((l) => ({ ...l, guest: false }));
      },
    };
  }, [ready, session, local, update, saveProfile, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
