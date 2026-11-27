import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayKey, useApp } from '../../lib/app-state';
import { EXAMS, examChapters, subjectLabel } from '../../lib/data';
import { shiftDay, uid, usePlanner } from '../../lib/planner';
import { pastel, useColors } from '../../lib/theme';
import { Bar, Btn, Card, H1, H2, Muted } from '../../lib/ui';

const EMOJIS = ['🏆', '⭐', '🎯', '📚', '💪', '🎉', '🥇', '🌸'];

export default function Progress() {
  const c = useColors();
  const app = useApp();
  const { p, set } = usePlanner();
  const today = dayKey();
  const subjects = EXAMS[app.exam].subjects;
  const attempts = app.attempts.filter((a) => a.exam === app.exam);

  // ---- per-subject tracker ----
  const rows = subjects.map((s) => {
    const chs = examChapters(app.exam, s);
    const chDone = chs.filter((i) => app.done[s]?.includes(i)).length;
    let correct = 0, total = 0;
    attempts.forEach((a) => {
      const t = a.bySubject?.[s];
      if (t) { correct += t.correct; total += t.total; }
    });
    const label = subjectLabel(s);
    const topics = p.topics.filter((t) => t.subject === label);
    const topicsDone = topics.filter((t) => t.done).length;
    const parts = [chs.length ? chDone / chs.length : null, total ? correct / total : null, topics.length ? topicsDone / topics.length : null].filter((x): x is number => x != null);
    // Mastery: average of chapters finished, test accuracy and planned topics completed (whatever exists).
    const mastery = parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
    return { s, label, chs: chs.length, chDone, correct, total, topics: topics.length, topicsDone, mastery };
  });

  // ---- activity calendar: last 35 days ----
  const days = Array.from({ length: 35 }, (_, i) => shiftDay(today, i - 34));
  const activity = (d: string) => app.answeredOn(d) + (p.focus[d] ?? 0) / 5 + p.topics.filter((t) => t.doneAt === d).length * 3;
  const max = Math.max(1, ...days.map(activity));

  // ---- weekly review ----
  const week = (offset: number) => Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6 - offset));
  const sumWeek = (ds: string[]) => ({
    q: ds.reduce((n, d) => n + app.answeredOn(d), 0),
    focus: ds.reduce((n, d) => n + (p.focus[d] ?? 0), 0),
    topics: p.topics.filter((t) => t.doneAt && ds.includes(t.doneAt)).length,
    water: ds.filter((d) => (p.health[d]?.water ?? 0) >= 8).length,
  });
  const tw = sumWeek(week(0));
  const lw = sumWeek(week(7));
  const delta = (a: number, b: number) => (a === b ? '' : a > b ? ` ▲${a - b}` : ` ▼${b - a}`);

  // ---- tests ----
  const recent = attempts.slice(0, 10).reverse();
  const pcts = attempts.map((a) => Math.max(0, a.marks) / Math.max(1, a.max));
  const bestPct = pcts.length ? Math.round(Math.max(...pcts) * 100) : 0;
  const avgPct = pcts.length ? Math.round((pcts.reduce((x, y) => x + y, 0) / pcts.length) * 100) : 0;

  // ---- achievements ----
  const totalQ = app.attempts.reduce((n, a) => n + a.correct + a.wrong, 0);
  const focusH = Object.values(p.focus).reduce((a, b) => a + b, 0) / 60;
  const allChDone = subjects.reduce((n, s) => n + examChapters(app.exam, s).filter((i) => app.done[s]?.includes(i)).length, 0);
  const badges = [
    { e: '🌱', t: 'First test', ok: app.attempts.length >= 1 },
    { e: '🔥', t: '7-day streak', ok: app.streak >= 7 },
    { e: '💯', t: '100 questions', ok: totalQ >= 100 },
    { e: '🚀', t: '1,000 questions', ok: totalQ >= 1000 },
    { e: '⭐', t: 'Level 5', ok: app.level >= 5 },
    { e: '📘', t: '10 chapters done', ok: allChDone >= 10 },
    { e: '⏱', t: '10 focus hours', ok: focusH >= 10 },
    { e: '🎯', t: 'Month goals done', ok: (() => { const l = p.targets[today.slice(0, 7)] ?? []; return l.length > 0 && l.every((t) => t.done); })() },
  ];
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const year = today.slice(0, 4);
  const mine = [...p.achievements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <H1>Progress</H1>
        <Muted>{EXAMS[app.exam].label}{app.board ? ` · ${app.board}` : ''}</Muted>

        {EXAMS[app.exam].comingSoon && <Card><Muted>Subjects for {EXAMS[app.exam].label} are coming soon. Your planner, health and achievements still work.</Muted></Card>}

        {rows.map((r) => {
          const t = pastel(c, r.label);
          return (
            <Card key={r.s} style={{ gap: 8, backgroundColor: t.bg, borderColor: t.bg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ color: t.ink, fontWeight: '800', fontSize: 19 }}>{r.label}</Text>
                <Text style={{ color: t.ink, fontWeight: '800', fontSize: 26 }}>{r.mastery}%</Text>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: '#ffffff99', overflow: 'hidden' }}>
                <View style={{ width: `${r.mastery}%`, height: '100%', backgroundColor: t.ink, borderRadius: 5 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Stat ink={t.ink} big={`${r.chDone}/${r.chs}`} small="chapters" />
                <Stat ink={t.ink} big={r.total ? `${Math.round((r.correct / r.total) * 100)}%` : '–'} small={`${r.total} questions`} />
                <Stat ink={t.ink} big={`${r.topicsDone}/${r.topics}`} small="topics" />
              </View>
            </Card>
          );
        })}
        <Muted>Mastery = average of chapters finished, test accuracy and planned topics completed.</Muted>
        <Btn ghost title="Open syllabus heat map" onPress={() => router.push('/syllabus')} />

        <Card style={{ gap: 10 }}>
          <H2>Test performance</H2>
          {recent.length ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90 }}>
                {recent.map((a) => {
                  const v = Math.max(0, a.marks) / Math.max(1, a.max);
                  return (
                    <View key={a.id} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                      <Text style={{ color: c.mut, fontSize: 10 }}>{Math.round(v * 100)}</Text>
                      <View style={{ width: '100%', height: Math.max(4, v * 70), borderRadius: 6, backgroundColor: v >= 0.8 ? c.ok : v >= 0.5 ? '#e693b0' : c.line }} />
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Stat ink={c.ink} big={`${bestPct}%`} small="best" />
                <Stat ink={c.ink} big={`${avgPct}%`} small="average" />
                <Stat ink={c.ink} big={`${attempts.length}`} small="tests" />
                <Stat ink={c.ink} big={`${app.mistakes.length}`} small="mistakes" />
              </View>
              <Muted>Last {recent.length} tests, score % (oldest → newest).</Muted>
            </>
          ) : (
            <Muted>Take a test in Practice to see your scores here.</Muted>
          )}
          {app.weak.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ color: c.ink, fontWeight: '800' }}>Weak topics</Text>
              {app.weak.map((w) => <Text key={w.subject + w.chapter} style={{ color: c.mut }}>• {w.name} ({subjectLabel(w.subject)}) · {w.pct}%</Text>)}
            </View>
          )}
          <Btn
            title="⚡ Exam Rush: revise weak topics + mistakes"
            disabled={!app.weak.length && !app.mistakes.length}
            onPress={() => router.navigate({ pathname: '/practice', params: { mode: 'rush', t: String(Date.now()) } })}
          />
          {!app.weak.length && !app.mistakes.length && <Muted>Exam Rush unlocks after a few tests show your weak spots.</Muted>}
        </Card>

        <Card style={{ gap: 10 }}>
          <H2>Study calendar</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {days.map((d) => {
              const v = activity(d) / max;
              const bg = v === 0 ? c.roseT : v < 0.34 ? '#f6c3d3' : v < 0.67 ? '#e693b0' : c.rose;
              return <View key={d} accessibilityLabel={`${d}: activity`} style={{ width: '12.2%', aspectRatio: 1, borderRadius: 8, backgroundColor: bg, borderWidth: d === today ? 2 : 0, borderColor: c.ink }} />;
            })}
          </View>
          <Muted>Last 5 weeks. Darker = more questions, focus time and topics finished.</Muted>
        </Card>

        <Card style={{ gap: 8, backgroundColor: c.lav, borderColor: c.lav }}>
          <Text style={{ color: c.lavInk, fontWeight: '800', fontSize: 18 }}>Weekly review</Text>
          <Text style={{ color: c.ink }}>❓ {tw.q} questions{delta(tw.q, lw.q)}</Text>
          <Text style={{ color: c.ink }}>⏱ {Math.round(tw.focus / 6) / 10} focus hours{delta(Math.round(tw.focus), Math.round(lw.focus))}</Text>
          <Text style={{ color: c.ink }}>📚 {tw.topics} topics finished{delta(tw.topics, lw.topics)}</Text>
          <Text style={{ color: c.ink }}>💧 {tw.water}/7 days water goal met</Text>
          <Muted>Compared with the week before (▲ more, ▼ less).</Muted>
        </Card>

        <Card style={{ gap: 10 }}>
          <H2>Badges</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {badges.map((b) => (
              <View key={b.t} style={{ width: '23%', flexGrow: 1, minWidth: 72, alignItems: 'center', padding: 8, borderRadius: 16, backgroundColor: b.ok ? c.lemon : c.bg, opacity: b.ok ? 1 : 0.45 }}>
                <Text style={{ fontSize: 26 }}>{b.e}</Text>
                <Text style={{ color: c.ink, fontSize: 11, textAlign: 'center' }}>{b.t}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ gap: 10 }}>
          <H2>My achievements {year}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {EMOJIS.map((e) => (
              <Pressable key={e} onPress={() => setEmoji(e)} style={{ padding: 6, borderRadius: 12, backgroundColor: emoji === e ? c.roseT : 'transparent' }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Scored 600 in mock test" placeholderTextColor={c.mut}
              style={{ flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.ink, backgroundColor: c.card }} />
            <Pressable onPress={() => { if (!title.trim()) return; set((x) => ({ ...x, achievements: [...x.achievements, { id: uid(), title: title.trim(), date: today, emoji }] })); setTitle(''); }}
              style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.rose, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>+</Text>
            </Pressable>
          </View>
          {mine.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '700' }}>{a.title}</Text>
                <Text style={{ color: c.mut, fontSize: 12 }}>{new Date(a.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
              <Pressable onPress={() => set((x) => ({ ...x, achievements: x.achievements.filter((y) => y.id !== a.id) }))} hitSlop={8}><Text style={{ color: c.mut }}>✕</Text></Pressable>
            </View>
          ))}
          {!mine.length && <Muted>Write down every win, big or small. 🌸</Muted>}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ big, small, ink }: { big: string; small: string; ink: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: ink, fontWeight: '800', fontSize: 18 }}>{big}</Text>
      <Text style={{ color: ink, fontSize: 12 }}>{small}</Text>
    </View>
  );
}
