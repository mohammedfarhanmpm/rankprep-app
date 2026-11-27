import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayKey, useApp } from '../../lib/app-state';
import { EXAMS, subjectLabel } from '../../lib/data';
import { TargetCat, emptyHealth, monthKey, prettyDay, shiftDay, uid, usePlanner } from '../../lib/planner';
import { Colors, pastel, useColors } from '../../lib/theme';
import { Bar, Btn, Card, H1, H2, Muted } from '../../lib/ui';

type Tab = 'today' | 'time' | 'month' | 'dates' | 'journal' | 'wish' | 'health';
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: '📝 Today' },
  { id: 'time', label: '🗓 Timetable' },
  { id: 'month', label: '🎯 Month' },
  { id: 'dates', label: '📅 Dates' },
  { id: 'journal', label: '📔 Journal' },
  { id: 'wish', label: '🎁 Wishlist' },
  { id: 'health', label: '🥗 Health' },
];

export default function PlannerScreen() {
  const c = useColors();
  const [tab, setTab] = useState<Tab>('today');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <H1>Planner</H1>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TABS.map((t) => {
              const on = t.id === tab;
              return (
                <Pressable key={t.id} onPress={() => setTab(t.id)} style={{ borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: on ? c.rose : c.card, borderWidth: 1, borderColor: on ? c.rose : c.line }}>
                  <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '700' }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {tab === 'today' && <Today />}
          {tab === 'time' && <Timetable />}
          {tab === 'month' && <Month />}
          {tab === 'dates' && <Dates />}
          {tab === 'journal' && <JournalTab />}
          {tab === 'wish' && <Wishlist />}
          {tab === 'health' && <HealthTab />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- shared bits ----------

function AddRow({ placeholder, onAdd, extra }: { placeholder: string; onAdd: (t: string) => void; extra?: React.ReactNode }) {
  const c = useColors();
  const [t, setT] = useState('');
  const add = () => {
    if (!t.trim()) return;
    onAdd(t.trim());
    setT('');
  };
  return (
    <View style={{ gap: 8 }}>
      {extra}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={t} onChangeText={setT} onSubmitEditing={add} placeholder={placeholder} placeholderTextColor={c.mut} returnKeyType="done" style={input(c)} />
        <Pressable onPress={add} accessibilityLabel="Add" style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.rose, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const input = (c: Colors) => ({ flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.ink, backgroundColor: c.card, minHeight: 48 });

function Check({ done, label, sub, onToggle, onDelete, tint }: { done: boolean; label: string; sub?: string; onToggle: () => void; onDelete?: () => void; tint?: { bg: string; ink: string } }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Pressable onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked: done }} hitSlop={8} style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2, borderColor: done ? c.ok : c.rose, backgroundColor: done ? c.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {done && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
      </Pressable>
      <Pressable onPress={onToggle} style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: c.ink, fontSize: 16, textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{label}</Text>
        {sub ? <Text style={{ color: c.mut, fontSize: 12 }}>{sub}</Text> : null}
      </Pressable>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel={`Delete ${label}`}>
          <Text style={{ color: c.mut, fontSize: 18 }}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

function DayNav({ day, setDay }: { day: string; setDay: (d: string) => void }) {
  const c = useColors();
  const today = dayKey();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable onPress={() => setDay(shiftDay(day, -1))} hitSlop={10}><Text style={{ color: c.rose, fontSize: 22, fontWeight: '800' }}>‹</Text></Pressable>
      <Pressable onPress={() => setDay(today)}><Text style={{ color: c.ink, fontWeight: '800', fontSize: 17 }}>{prettyDay(day, today)}</Text></Pressable>
      <Pressable onPress={() => setDay(shiftDay(day, 1))} hitSlop={10}><Text style={{ color: c.rose, fontSize: 22, fontWeight: '800' }}>›</Text></Pressable>
    </View>
  );
}

function Chip({ label, on, onPress, tint }: { label: string; on: boolean; onPress: () => void; tint: { bg: string; ink: string } }) {
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: on ? tint.ink : tint.bg }}>
      <Text style={{ color: on ? '#fff' : tint.ink, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

// ---------- Today: to-dos + topics ----------

function Today() {
  const c = useColors();
  const app = useApp();
  const { p, set } = usePlanner();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const subjects = [...EXAMS[app.exam].subjects.map(subjectLabel), 'Other'];
  const [subj, setSubj] = useState<string>(subjects[0]);

  const todos = p.todos[day] ?? [];
  const topics = p.topics.filter((t) => t.date === day);
  const pendingPast = p.topics.filter((t) => !t.done && t.date < today);
  const done = todos.filter((t) => t.done).length + topics.filter((t) => t.done).length;
  const total = todos.length + topics.length;

  const slots = p.timetable[String(new Date(day + 'T12:00:00').getDay())] ?? [];
  return (
    <>
      <Card style={{ gap: 10 }}>
        <DayNav day={day} setDay={setDay} />
        <Bar pct={total ? (done / total) * 100 : 0} />
        <Muted>{total ? `${done} of ${total} done${total - done ? ` · ${total - done} pending` : ' · all done! 🎉'}` : 'Plan your day: add tasks and topics below.'}</Muted>
      </Card>

      {slots.length > 0 && (
        <Card style={{ gap: 4, backgroundColor: c.sky, borderColor: c.sky }}>
          <Text style={{ color: c.skyInk, fontWeight: '800', fontSize: 16 }}>🗓 Timetable</Text>
          {slots.map((s) => (
            <Text key={s.id} style={{ color: c.ink }}><Text style={{ fontWeight: '800' }}>{s.time}</Text>  {s.subject}{s.what ? ` · ${s.what}` : ''}</Text>
          ))}
        </Card>
      )}

      {day === today && pendingPast.length > 0 && (
        <Card style={{ gap: 8, backgroundColor: c.lemon, borderColor: c.lemon }}>
          <Text style={{ color: c.lemonInk, fontWeight: '800' }}>{pendingPast.length} topic{pendingPast.length > 1 ? 's' : ''} pending from earlier days</Text>
          <Btn ghost title="Move them to today" onPress={() => set((x) => ({ ...x, topics: x.topics.map((t) => (!t.done && t.date < today ? { ...t, date: today } : t)) }))} />
        </Card>
      )}

      <Card style={{ gap: 6 }}>
        <H2>📚 Topics to finish</H2>
        {topics.map((t) => (
          <Check
            key={t.id}
            done={t.done}
            label={t.text}
            sub={t.subject ?? undefined}
            onToggle={() => set((x) => ({ ...x, topics: x.topics.map((y) => (y.id === t.id ? { ...y, done: !y.done, doneAt: !y.done ? dayKey() : undefined } : y)) }))}
            onDelete={() => set((x) => ({ ...x, topics: x.topics.filter((y) => y.id !== t.id) }))}
          />
        ))}
        <AddRow
          placeholder="e.g. Laws of Motion – friction"
          onAdd={(text) => set((x) => ({ ...x, topics: [...x.topics, { id: uid(), text, subject: subj === 'Other' ? null : subj, date: day, done: false }] }))}
          extra={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {subjects.map((s) => <Chip key={s} label={s} on={s === subj} onPress={() => setSubj(s)} tint={pastel(c, s)} />)}
            </View>
          }
        />
      </Card>

      <Card style={{ gap: 6 }}>
        <H2>✅ To-do</H2>
        {todos.map((t) => (
          <Check
            key={t.id}
            done={t.done}
            label={t.text}
            onToggle={() => set((x) => ({ ...x, todos: { ...x.todos, [day]: (x.todos[day] ?? []).map((y) => (y.id === t.id ? { ...y, done: !y.done } : y)) } }))}
            onDelete={() => set((x) => ({ ...x, todos: { ...x.todos, [day]: (x.todos[day] ?? []).filter((y) => y.id !== t.id) } }))}
          />
        ))}
        <AddRow placeholder="Add a task" onAdd={(text) => set((x) => ({ ...x, todos: { ...x.todos, [day]: [...(x.todos[day] ?? []), { id: uid(), text, done: false }] } }))} />
      </Card>

      <Btn ghost title="⏱ Start a focus session" onPress={() => router.push('/timer')} />
    </>
  );
}

// ---------- Weekly timetable ----------

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Timetable() {
  const c = useColors();
  const app = useApp();
  const { p, set } = usePlanner();
  const [wd, setWd] = useState(String(new Date().getDay()));
  const subjects = [...EXAMS[app.exam].subjects.map(subjectLabel), 'Other'];
  const [subj, setSubj] = useState(subjects[0]);
  const [time, setTime] = useState('');
  const slots = [...(p.timetable[wd] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {WEEK.map((w, i) => {
          const on = String(i) === wd;
          const n = (p.timetable[String(i)] ?? []).length;
          return (
            <Pressable key={w} onPress={() => setWd(String(i))} style={{ alignItems: 'center', paddingVertical: 8, width: '13.5%', borderRadius: 14, backgroundColor: on ? c.rose : c.card, borderWidth: 1, borderColor: on ? c.rose : c.line }}>
              <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '800', fontSize: 13 }}>{w}</Text>
              <Text style={{ color: on ? '#fff' : c.mut, fontSize: 11 }}>{n || '·'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Card style={{ gap: 6 }}>
        <H2>{WEEK[+wd]} plan</H2>
        {slots.map((s) => {
          const t = pastel(c, s.subject);
          return (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: t.bg }}>
              <Text style={{ color: t.ink, fontWeight: '800', minWidth: 92 }}>{s.time || '—'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.ink, fontWeight: '800' }}>{s.subject}</Text>
                {s.what ? <Text style={{ color: c.ink }}>{s.what}</Text> : null}
              </View>
              <Pressable onPress={() => set((x) => ({ ...x, timetable: { ...x.timetable, [wd]: (x.timetable[wd] ?? []).filter((y) => y.id !== s.id) } }))} hitSlop={8}><Text style={{ color: c.mut }}>✕</Text></Pressable>
            </View>
          );
        })}
        {!slots.length && <Muted>No slots yet. Add when you study what, and from which book.</Muted>}
        <AddRow
          placeholder="Book / chapter, e.g. NCERT ch 5 + 20 Qs"
          onAdd={(what) => { set((x) => ({ ...x, timetable: { ...x.timetable, [wd]: [...(x.timetable[wd] ?? []), { id: uid(), time: time.trim(), subject: subj, what }] } })); }}
          extra={
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {subjects.map((s) => <Chip key={s} label={s} on={s === subj} onPress={() => setSubj(s)} tint={pastel(c, s)} />)}
              </View>
              <TextInput value={time} onChangeText={setTime} placeholder="Time, e.g. 6:00–7:30 am" placeholderTextColor={c.mut} style={input(c)} />
            </>
          }
        />
        <Btn
          ghost
          title={`Copy ${WEEK[+wd]} to all weekdays`}
          onPress={() => set((x) => ({ ...x, timetable: { ...x.timetable, ...Object.fromEntries(['1', '2', '3', '4', '5'].filter((d) => d !== wd).map((d) => [d, slots.map((s) => ({ ...s, id: uid() }))])) } }))}
        />
      </Card>
    </>
  );
}

// ---------- Month targets ----------

function Month() {
  const c = useColors();
  const { p, set } = usePlanner();
  const now = monthKey();
  const [m, setM] = useState(now);
  const [cat, setCat] = useState<TargetCat>('Study');
  const list = p.targets[m] ?? [];
  const done = list.filter((t) => t.done).length;
  const past = m < now;
  const shift = (n: number) => {
    const [y, mo] = m.split('-').map(Number);
    setM(monthKey(new Date(y, mo - 1 + n, 1)));
  };
  const label = new Date(m + '-01T12:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <>
      <Card style={{ gap: 10, backgroundColor: c.lav, borderColor: c.lav }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={() => shift(-1)} hitSlop={10}><Text style={{ color: c.lavInk, fontSize: 22, fontWeight: '800' }}>‹</Text></Pressable>
          <Text style={{ color: c.lavInk, fontWeight: '800', fontSize: 18 }}>{label}</Text>
          <Pressable onPress={() => shift(1)} hitSlop={10}><Text style={{ color: c.lavInk, fontSize: 22, fontWeight: '800' }}>›</Text></Pressable>
        </View>
        <Text style={{ color: c.lavInk, fontSize: 36, fontWeight: '800' }}>{done}/{list.length}</Text>
        <Text style={{ color: c.lavInk }}>{list.length ? (past ? `${list.length - done} missed` : `${list.length - done} to go`) : 'Set your goals for this month.'}</Text>
      </Card>
      <Card style={{ gap: 6 }}>
        {list.map((t) => (
          <Check
            key={t.id}
            done={t.done}
            label={t.text}
            sub={`${t.cat}${past && !t.done ? ' · missed' : ''}`}
            onToggle={() => set((x) => ({ ...x, targets: { ...x.targets, [m]: (x.targets[m] ?? []).map((y) => (y.id === t.id ? { ...y, done: !y.done } : y)) } }))}
            onDelete={() => set((x) => ({ ...x, targets: { ...x.targets, [m]: (x.targets[m] ?? []).filter((y) => y.id !== t.id) } }))}
          />
        ))}
        <AddRow
          placeholder="e.g. Finish Organic Chemistry"
          onAdd={(text) => set((x) => ({ ...x, targets: { ...x.targets, [m]: [...(x.targets[m] ?? []), { id: uid(), text, cat, done: false }] } }))}
          extra={
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['Study', 'Health', 'Personal'] as TargetCat[]).map((k) => <Chip key={k} label={k} on={k === cat} onPress={() => setCat(k)} tint={pastel(c, k)} />)}
            </View>
          }
        />
        {past && list.some((t) => !t.done) && (
          <Btn ghost title="Carry missed targets to this month" onPress={() => set((x) => ({ ...x, targets: { ...x.targets, [now]: [...(x.targets[now] ?? []), ...list.filter((t) => !t.done).map((t) => ({ ...t, id: uid() }))] } }))} />
        )}
      </Card>
    </>
  );
}

// ---------- Important dates ----------

function Dates() {
  const c = useColors();
  const { p, addReminder, removeReminder } = usePlanner();
  const today = dayKey();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(shiftDay(today, 7));
  const [err, setErr] = useState('');
  const upcoming = p.reminders.filter((r) => r.date >= today);
  const past = p.reminders.filter((r) => r.date < today);
  const days = (d: string) => Math.round((new Date(d + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 864e5);

  return (
    <>
      <Card style={{ gap: 10 }}>
        <H2>Add an important date</H2>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Physics unit test, Mom's birthday" placeholderTextColor={c.mut} style={input(c)} />
        <TextInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={c.mut} style={input(c)} />
        {err ? <Text style={{ color: c.bad }}>{err}</Text> : null}
        <Btn
          title="Save & remind me"
          onPress={() => {
            if (!title.trim()) return setErr('Add a title.');
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date + 'T12:00:00').getTime())) return setErr('Date must look like 2027-01-22.');
            setErr('');
            addReminder({ title: title.trim(), date });
            setTitle('');
          }}
        />
        <Muted>PIP reminds you the evening before and on the morning of the day.</Muted>
      </Card>
      {upcoming.map((r) => {
        const n = days(r.date);
        const t = pastel(c, n <= 3 ? 'Personal' : 'Study');
        return (
          <Card key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bg, borderColor: t.bg }}>
            <View style={{ alignItems: 'center', minWidth: 54 }}>
              <Text style={{ color: t.ink, fontSize: 26, fontWeight: '800' }}>{n}</Text>
              <Text style={{ color: t.ink, fontSize: 12 }}>{n === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontWeight: '700', fontSize: 16 }}>{r.title}</Text>
              <Text style={{ color: c.mut }}>{prettyDay(r.date, today)}</Text>
            </View>
            <Pressable onPress={() => removeReminder(r.id)} hitSlop={8}><Text style={{ color: c.mut, fontSize: 18 }}>✕</Text></Pressable>
          </Card>
        );
      })}
      {past.length > 0 && <Muted>Past: {past.map((r) => r.title).join(', ')}</Muted>}
    </>
  );
}

// ---------- Journal ----------

const DAY_EMOJI = ['😄', '🙂', '😐', '😢', '😤', '🥳', '😴'];

function JournalTab() {
  const c = useColors();
  const { p, set } = usePlanner();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const j = p.journal[day] ?? { text: '' };
  const write = (patch: Partial<typeof j>) => set((x) => ({ ...x, journal: { ...x.journal, [day]: { ...j, ...patch } } }));
  const recent = Object.keys(p.journal).filter((d) => p.journal[d].text.trim()).sort().reverse().slice(0, 5);
  return (
    <>
      <Card style={{ gap: 10 }}>
        <DayNav day={day} setDay={setDay} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAY_EMOJI.map((e) => (
            <Pressable key={e} onPress={() => write({ emoji: e })} style={{ padding: 4, borderRadius: 12, backgroundColor: j.emoji === e ? c.roseT : 'transparent' }}>
              <Text style={{ fontSize: 28 }}>{e}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={j.text}
          onChangeText={(text) => write({ text })}
          placeholder="What was special today? Good moments, things you learned…"
          placeholderTextColor={c.mut}
          multiline
          textAlignVertical="top"
          style={[input(c), { minHeight: 180, lineHeight: 23 }]}
        />
        <Muted>🔒 Saved only on this phone.</Muted>
      </Card>
      {recent.length > 0 && (
        <Card style={{ gap: 8 }}>
          <H2>Recent days</H2>
          {recent.map((d) => (
            <Pressable key={d} onPress={() => setDay(d)} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ color: c.ink, fontWeight: '700' }}>{p.journal[d].emoji ?? '📔'} {prettyDay(d, today)}</Text>
              <Text style={{ color: c.mut }} numberOfLines={1}>{p.journal[d].text}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </>
  );
}

// ---------- Wishlist ----------

function Wishlist() {
  const c = useColors();
  const { p, set } = usePlanner();
  const [price, setPrice] = useState('');
  const open = p.wishes.filter((w) => !w.bought);
  const got = p.wishes.filter((w) => w.bought);
  return (
    <>
      <Card style={{ gap: 6, backgroundColor: c.peach, borderColor: c.peach }}>
        <Text style={{ color: c.peachInk, fontWeight: '800', fontSize: 18 }}>🎁 {open.length} wished · {got.length} got</Text>
        <Text style={{ color: c.peachInk }}>Tip: link a wish to a study target, a little reward for finishing it.</Text>
      </Card>
      <Card style={{ gap: 6 }}>
        {open.map((w) => (
          <Check key={w.id} done={false} label={w.text} sub={w.price ? `₹${w.price}` : undefined}
            onToggle={() => set((x) => ({ ...x, wishes: x.wishes.map((y) => (y.id === w.id ? { ...y, bought: true, boughtAt: dayKey() } : y)) }))}
            onDelete={() => set((x) => ({ ...x, wishes: x.wishes.filter((y) => y.id !== w.id) }))} />
        ))}
        <AddRow
          placeholder="Something you'd love to get"
          onAdd={(text) => { set((x) => ({ ...x, wishes: [...x.wishes, { id: uid(), text, price: price.trim() || undefined, bought: false }] })); setPrice(''); }}
          extra={<TextInput value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Price ₹ (optional)" placeholderTextColor={c.mut} style={input(c)} />}
        />
      </Card>
      {got.length > 0 && (
        <Card style={{ gap: 6 }}>
          <H2>Got it! 🎉</H2>
          {got.map((w) => (
            <Check key={w.id} done label={w.text} sub={w.boughtAt ? `on ${w.boughtAt}` : undefined}
              onToggle={() => set((x) => ({ ...x, wishes: x.wishes.map((y) => (y.id === w.id ? { ...y, bought: false, boughtAt: undefined } : y)) }))}
              onDelete={() => set((x) => ({ ...x, wishes: x.wishes.filter((y) => y.id !== w.id) }))} />
          ))}
        </Card>
      )}
    </>
  );
}

// ---------- Health ----------

const WATER_GOAL = 8;

function HealthTab() {
  const c = useColors();
  const { p, set } = usePlanner();
  const today = dayKey();
  const [day, setDay] = useState(today);
  const [mins, setMins] = useState('20');
  const h = p.health[day] ?? emptyHealth();
  const put = (patch: Partial<typeof h>) => set((x) => ({ ...x, health: { ...x.health, [day]: { ...h, ...patch } } }));
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const exMin = h.exercise.reduce((n, e) => n + e.min, 0);

  return (
    <>
      <Card style={{ gap: 10 }}>
        <DayNav day={day} setDay={setDay} />
        <Text style={{ color: c.skyInk, fontWeight: '800', fontSize: 16 }}>💧 Water: {h.water}/{WATER_GOAL} glasses</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: Math.max(WATER_GOAL, h.water + 1) }, (_, i) => (
            <Pressable key={i} onPress={() => put({ water: i + 1 === h.water ? i : i + 1 })} accessibilityLabel={`${i + 1} glasses`}
              style={{ width: 36, height: 44, borderRadius: 10, backgroundColor: i < h.water ? c.skyInk : c.sky, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16 }}>{i < h.water ? '💧' : ''}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: c.lavInk, fontWeight: '800', fontSize: 16 }}>😴 Sleep: {h.sleep ?? '–'} hours</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {[5, 6, 7, 8, 9].map((n) => <Chip key={n} label={`${n} h`} on={h.sleep === n} onPress={() => put({ sleep: n })} tint={pastel(c, 'Study')} />)}
        </View>
      </Card>

      <Card style={{ gap: 6 }}>
        <H2>🏃 Exercise · {exMin} min</H2>
        {h.exercise.map((e) => (
          <Check key={e.id} done label={e.text} sub={`${e.min} min`} onToggle={() => {}} onDelete={() => put({ exercise: h.exercise.filter((y) => y.id !== e.id) })} />
        ))}
        <AddRow
          placeholder="e.g. Walk, yoga, cycling"
          onAdd={(text) => put({ exercise: [...h.exercise, { id: uid(), text, min: Math.max(1, parseInt(mins, 10) || 0) }] })}
          extra={<View style={{ flexDirection: 'row', gap: 6 }}>{['10', '20', '30', '45'].map((m) => <Chip key={m} label={`${m} min`} on={mins === m} onPress={() => setMins(m)} tint={pastel(c, 'Health')} />)}</View>}
        />
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>🍎 Diet / meals</H2>
        <TextInput value={h.meals} onChangeText={(meals) => put({ meals })} multiline textAlignVertical="top" placeholder="Breakfast, lunch, snacks, dinner…" placeholderTextColor={c.mut} style={[input(c), { minHeight: 90 }]} />
      </Card>

      <Card style={{ gap: 8 }}>
        <H2>This week</H2>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((d) => {
            const x = p.health[d];
            return (
              <View key={d} style={{ alignItems: 'center', gap: 3 }}>
                <Text style={{ color: c.mut, fontSize: 11 }}>{new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: x && x.water >= WATER_GOAL ? c.skyInk : c.sky }} />
                <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: x && x.exercise.length ? c.mintInk : c.mint }} />
              </View>
            );
          })}
        </View>
        <Muted>Top row: water goal met · bottom row: exercised</Muted>
      </Card>
    </>
  );
}
