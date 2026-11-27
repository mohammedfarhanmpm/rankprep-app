import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mood, dayKey, useApp } from '../../lib/app-state';
import { MOOD_PLAN, motivationFor } from '../../lib/motivation';
import { prettyDay, usePlanner } from '../../lib/planner';
import { EXAMS, daysUntil, examChapters, subjectLabel } from '../../lib/data';
import { PipRobot } from '../../lib/PipRobot';
import { useColors } from '../../lib/theme';
import { Bar, Btn, Card, H1, H2, Muted } from '../../lib/ui';

const GOALS = [10, 20, 40, 60];

const MOODS: { id: Mood; emoji: string; label: string; reply: string }[] = [
  { id: 'great', emoji: '🤩', label: 'Great', reply: "Awesome energy! Let's make today count." },
  { id: 'good', emoji: '🙂', label: 'Good', reply: 'Nice! A steady day of study ahead.' },
  { id: 'okay', emoji: '😐', label: 'Okay', reply: 'Okay is fine. Small steps still move you forward.' },
  { id: 'tired', emoji: '😴', label: 'Tired', reply: "PIP halved today's goal. Rest well tonight." },
  { id: 'stressed', emoji: '😣', label: 'Stressed', reply: "Today's goal is lighter. Try 2 minutes of breathing first." },
  { id: 'sick', emoji: '🤒', label: 'Sick', reply: 'Get well soon! Today’s goal is paused. Rest well. 🤍' },
];

export default function Home() {
  const c = useColors();
  const app = useApp();
  const ex = EXAMS[app.exam];
  const days = daysUntil(app.examDate);
  const [dateText, setDateText] = useState(app.examDate);
  const recent = app.attempts.filter((a) => a.exam === app.exam);
  const totalCh = Math.max(1, ex.subjects.reduce((s, x) => s + examChapters(app.exam, x).length, 0));
  const doneCh = ex.subjects.reduce((s, x) => s + examChapters(app.exam, x).filter((i) => app.done[x]?.includes(i)).length, 0);
  const goalDone = app.dailyGoal > 0 && app.today >= app.dailyGoal;
  const { p } = usePlanner();
  const todayKey = dayKey();
  const todos = p.todos[todayKey] ?? [];
  const topics = p.topics.filter((t) => t.date === todayKey);
  const planTotal = todos.length + topics.length;
  const planDone = todos.filter((t) => t.done).length + topics.filter((t) => t.done).length;
  const nextTopic = topics.find((t) => !t.done) ?? (todos.find((t) => !t.done) as { text: string } | undefined);
  const upcoming = p.reminders.find((r) => r.date >= todayKey);
  const nextDate = upcoming ? { title: upcoming.title, when: prettyDay(upcoming.date, todayKey) } : null;
  const slots = [...(p.timetable[String(new Date().getDay())] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning!' : hour < 17 ? 'Good afternoon!' : 'Good evening!';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 8 }}>
            <H1>{hello}</H1>
            <Muted>{app.dailyGoal === 0 ? 'Rest day. Get well soon! 🤍' : goalDone ? "Today's goal done. PIP is happy!" : `I'm PIP. Let's do ${app.dailyGoal - app.today} more questions today.`}</Muted>
            <Pressable onPress={() => router.push({ pathname: '/onboarding', params: { change: '1' } })} accessibilityLabel="Change class" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: c.rose, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
              <Text style={{ color: c.rose, fontWeight: '800' }}>{ex.label}{app.board ? ` · ${app.board}` : ''}</Text>
              <Text style={{ color: c.rose, fontWeight: '800' }}>▾</Text>
            </Pressable>
          </View>
          <PipRobot mood={goalDone ? 'happy' : 'idle'} size={140} />
        </View>

        {/* Daily mood check-in */}
        {!app.mood ? (
          <Card style={{ gap: 10, borderColor: c.rose }}>
            <H2>How are you feeling today?</H2>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {MOODS.map((m) => (
                <Pressable key={m.id} onPress={() => app.setMood(m.id)} accessibilityLabel={m.label} style={{ alignItems: 'center', gap: 4, padding: 2, minWidth: 48 }}>
                  <Text style={{ fontSize: 32 }}>{m.emoji}</Text>
                  <Text style={{ color: c.mut, fontSize: 12 }}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : (
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 30 }}>{MOODS.find((m) => m.id === app.mood)?.emoji}</Text>
              <Text style={{ color: c.ink, flex: 1 }}>{MOODS.find((m) => m.id === app.mood)?.reply}</Text>
            </View>
            <Pressable onPress={() => router.push(MOOD_PLAN[app.mood!].route as never)} style={{ backgroundColor: c.roseT, borderRadius: 14, padding: 12 }}>
              <Text style={{ color: c.rose, fontWeight: '800' }}>PIP suggests: {MOOD_PLAN[app.mood!].action} →</Text>
              <Text style={{ color: c.ink }}>{MOOD_PLAN[app.mood!].text}</Text>
            </Pressable>
          </Card>
        )}

        {/* Motivation corner */}
        <Pressable onPress={() => router.push('/motivation')}>
          <Card style={{ backgroundColor: c.lav, borderColor: c.lav, gap: 4 }}>
            <Text style={{ color: c.lavInk, fontWeight: '800' }}>💬 Thought for today</Text>
            <Text style={{ color: c.ink, fontSize: 16, lineHeight: 23 }}>“{motivationFor(app.mood, todayKey)}”</Text>
          </Card>
        </Pressable>

        {/* Today's plan from the Planner */}
        <Pressable onPress={() => router.navigate('/planner')}>
          <Card style={{ gap: 6, backgroundColor: c.mint, borderColor: c.mint }}>
            <Text style={{ color: c.mintInk, fontWeight: '800', fontSize: 17 }}>📝 Today's plan</Text>
            {planTotal ? (
              <>
                <Text style={{ color: c.ink }}>{planDone} of {planTotal} done{planTotal - planDone ? ` · ${planTotal - planDone} pending` : ' 🎉'}</Text>
                {nextTopic ? <Text style={{ color: c.mut }} numberOfLines={1}>Next: {nextTopic.text}</Text> : null}
              </>
            ) : (
              <Text style={{ color: c.ink }}>Nothing planned yet. Tap to add today's topics and tasks.</Text>
            )}
            {slots.length ? <Text style={{ color: c.ink }}>🗓 {slots.map((s) => `${s.time ? s.time + ' ' : ''}${s.subject}`).join(' · ')}</Text> : null}
            {nextDate ? <Text style={{ color: c.mintInk, fontWeight: '700' }}>📅 {nextDate.title} · {nextDate.when}</Text> : null}
          </Card>
        </Pressable>

        {/* Spaced revision due today */}
        {app.due.length > 0 && (
          <Card style={{ gap: 8, borderColor: '#f0b400' }}>
            <H2>🔁 Revise today</H2>
            <Muted>Chapters you finished earlier. A 10-minute look now keeps them in memory.</Muted>
            {app.due.map((d) => (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text style={{ color: c.ink, flex: 1 }}>{d.name} <Text style={{ color: c.mut }}>· day {d.day}</Text></Text>
                <Pressable onPress={() => router.navigate({ pathname: '/practice', params: { subject: d.subject, chapter: String(d.chapter) } })}>
                  <Text style={{ color: c.rose, fontWeight: '700' }}>Test</Text>
                </Pressable>
                <Pressable onPress={() => app.markRevised(d.key)} style={{ backgroundColor: c.ok, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Done ✓</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        {/* Toolkit */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[
            { icon: '⚡', label: 'Quick test', sub: '15 Q · 10 min', go: () => router.navigate({ pathname: '/practice', params: { mode: 'quick', t: String(Date.now()) } }) },
            { icon: '📕', label: 'Mistakes', sub: `${app.mistakes.length} saved`, go: () => router.push('/mistakes') },
            { icon: '📱', label: 'Flashcards', sub: 'Swipe to learn', go: () => router.push('/flashcards') },
            { icon: '📘', label: 'Formulas', sub: 'All chapters', go: () => router.push('/formulas') },
            { icon: '🌬️', label: 'Relax', sub: '2-min reset', go: () => router.push('/relax') },
            { icon: '🔥', label: 'Vent box', sub: 'Private', go: () => router.push('/vent') },
            { icon: '🎯', label: 'Focus mode', sub: 'No distractions', go: () => router.push('/focus') },
            { icon: '⏱', label: 'Pomodoro', sub: '25 + 5 timer', go: () => router.push('/timer') },
            { icon: '💬', label: 'Motivation', sub: 'Mood & quotes', go: () => router.push('/motivation') },
            { icon: '🗺️', label: 'Syllabus', sub: 'Heat map', go: () => router.push('/syllabus') },
            { icon: '🎁', label: 'Wishlist', sub: 'Planner', go: () => router.navigate('/planner') },
          ].map((t) => (
            <Pressable key={t.label} onPress={t.go} style={({ pressed }) => ({ width: '31.5%', flexGrow: 1, minWidth: 96, borderWidth: 1.5, borderColor: c.line, backgroundColor: pressed ? c.roseT : c.card, borderRadius: 14, padding: 12, gap: 2 })}>
              <Text style={{ fontSize: 24 }}>{t.icon}</Text>
              <Text style={{ color: c.ink, fontWeight: '700' }}>{t.label}</Text>
              <Text style={{ color: c.mut, fontSize: 12 }}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Streak, level, daily goal */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, gap: 2 }}>
            <Muted>Streak</Muted>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.ink }}>🔥 {app.streak}</Text>
            <Muted>{app.streak === 1 ? 'day' : 'days'}</Muted>
          </Card>
          <Card style={{ flex: 1, gap: 4 }}>
            <Muted>Level {app.level}</Muted>
            <Text style={{ fontSize: 28, fontWeight: '800', color: c.ink }}>{app.xp} XP</Text>
            <Bar pct={app.levelPct} />
          </Card>
        </View>

        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Daily goal</H2>
            <Text style={{ color: goalDone ? c.ok : c.rose, fontWeight: '800', fontSize: 18 }}>{Math.min(app.today, app.dailyGoal)}/{app.dailyGoal}</Text>
          </View>
          <Bar pct={app.dailyGoal ? (app.today / app.dailyGoal) * 100 : 100} />
          {app.dailyGoal < app.goalBase && <Muted>Lightened from {app.goalBase} because of how you feel today. 💚</Muted>}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Muted>Questions per day:</Muted>
            {GOALS.map((g) => (
              <Pressable key={g} onPress={() => app.setDailyGoal(g)} style={{ borderWidth: 1.5, borderColor: g === app.goalBase ? c.rose : c.line, backgroundColor: g === app.goalBase ? c.roseT : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: c.ink, fontWeight: '600' }}>{g}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={{ backgroundColor: c.lav, borderColor: c.lav }}>
          <Text style={{ color: c.lavInk }}>{ex.name}</Text>
          <Text style={{ color: c.lavInk, fontSize: 56, fontWeight: '800', letterSpacing: -2 }}>{days > 0 ? days : 'Today'}</Text>
          <Text style={{ color: c.lavInk }}>{days > 0 ? 'days to go' : 'All the best!'}</Text>
        </Card>

        <Btn title="Start a practice test" onPress={() => router.navigate('/practice')} />
        <Btn ghost title="Ask PIP a doubt" onPress={() => router.navigate('/pip')} />

        {app.weak.length > 0 && (
          <Card style={{ gap: 8 }}>
            <H2>PIP says: revise these</H2>
            <Muted>Chapters where you scored below 60%. Tap to practise.</Muted>
            {app.weak.map((w) => (
              <Pressable key={`${w.subject}${w.chapter}`} onPress={() => router.navigate({ pathname: '/practice', params: { subject: w.subject, chapter: String(w.chapter) } })} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                <Text style={{ color: c.ink, flex: 1 }}>{w.name} <Text style={{ color: c.mut }}>· {subjectLabel(w.subject)}</Text></Text>
                <Text style={{ color: c.bad, fontWeight: '700' }}>{w.pct}%</Text>
              </Pressable>
            ))}
          </Card>
        )}

        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <H2>Syllabus done</H2>
            <Text style={{ color: c.rose, fontWeight: '800', fontSize: 18 }}>{Math.round((doneCh / totalCh) * 100)}%</Text>
          </View>
          <Bar pct={(doneCh / totalCh) * 100} />
          <Muted>{doneCh} of {totalCh} chapters</Muted>
        </Card>

        {recent.length > 0 && (
          <Card style={{ gap: 8 }}>
            <H2>Recent tests</H2>
            {recent.slice(0, 5).map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 8 }}>
                <Text style={{ color: c.ink, flex: 1 }} numberOfLines={1}>{a.label} <Text style={{ color: c.mut }}>· {new Date(a.createdAt).toLocaleDateString()}</Text></Text>
                <Text style={{ color: c.ink, fontWeight: '600' }}>{a.marks} / {a.max}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={{ gap: 8 }}>
          <H2>Exam date</H2>
          <Muted>Estimated from past NTA schedules. Change it when NTA announces (YYYY-MM-DD).</Muted>
          <TextInput
            value={dateText}
            onChangeText={setDateText}
            onEndEditing={() => (/^\d{4}-\d{2}-\d{2}$/.test(dateText) ? app.setExamDate(dateText) : setDateText(app.examDate))}
            style={{ borderWidth: 1.5, borderColor: c.line, borderRadius: 10, padding: 12, fontSize: 16, color: c.ink }}
          />
        </Card>

        <Card style={{ gap: 10 }}>
          <Muted>{app.session ? `Signed in as ${app.session.user.email}` : 'Guest mode: progress is saved on this phone only.'}</Muted>
          <Btn
            ghost
            title={app.session ? 'Sign out' : app.cloudEnabled ? 'Sign in to sync' : 'Cloud sync not set up'}
            disabled={!app.cloudEnabled}
            onPress={async () => {
              await app.signOut();
              router.replace('/login');
            }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
