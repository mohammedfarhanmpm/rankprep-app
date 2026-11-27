import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { dayKey } from '../lib/app-state';
import { usePlanner } from '../lib/planner';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, Muted, Segmented } from '../lib/ui';

type Mode = '25' | '5' | '50';
const MINUTES: Record<Mode, number> = { '25': 25, '5': 5, '50': 50 };

// Guilt-free break ideas: move the body, rest the eyes, skip the reels.
const BREAK_IDEAS = [
  { icon: '💧', text: 'Drink a full glass of water.' },
  { icon: '🚶', text: 'Walk around the house for 2 minutes.' },
  { icon: '🧘', text: 'Stretch: arms up, touch your toes, roll your shoulders.' },
  { icon: '👀', text: 'Look out of the window at something far away.' },
  { icon: '🌬️', text: 'Take 5 slow, deep breaths.' },
  { icon: '🍎', text: 'Eat a fruit or a handful of nuts.' },
  { icon: '🪟', text: 'Open a window and get some fresh air.' },
  { icon: '📵', text: 'Keep the phone face down. Reels can wait till evening.' },
];

export default function Timer() {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('25');
  const [endAt, setEndAt] = useState<number | null>(null); // wall-clock end, so it survives app switching
  const [left, setLeft] = useState(MINUTES['25'] * 60);
  const [sessions, setSessions] = useState(0);
  const [idea, setIdea] = useState(0);
  const { addFocus } = usePlanner();

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        setEndAt(null);
        if (mode !== '5') {
          setSessions((n) => n + 1);
          addFocus(dayKey(), MINUTES[mode]); // counts toward Progress / weekly review
          setIdea((i) => (i + 3) % BREAK_IDEAS.length);
          setMode('5');
          setLeft(5 * 60);
        } else {
          setMode('25');
          setLeft(25 * 60);
        }
      }
    }, 500);
    return () => clearInterval(t);
  }, [endAt, mode, addFocus]);

  const pick = (m: Mode) => {
    setEndAt(null);
    setMode(m);
    setLeft(MINUTES[m] * 60);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Focus timer</H1>
        <Segmented<Mode> value={mode} onChange={pick} options={[{ value: '25', label: 'Study 25' }, { value: '50', label: 'Deep 50' }, { value: '5', label: 'Break 5' }]} />
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 80, fontWeight: '800', color: mode === '5' ? c.ok : c.rose, fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{mm}:{ss}</Text>
          <Muted>{mode === '5' ? 'Break: stretch, drink water' : 'Phone down. One chapter at a time.'}</Muted>
        </Card>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 2 }} title={endAt ? 'Pause' : 'Start'} onPress={() => (endAt ? setEndAt(null) : setEndAt(Date.now() + left * 1000))} />
          <Btn style={{ flex: 1 }} ghost title="Reset" onPress={() => pick(mode)} />
        </View>
        <Muted style={{ textAlign: 'center' }}>Sessions completed: {sessions}</Muted>
        {mode === '5' && (
          <Card style={{ gap: 10, borderColor: c.ok }}>
            <Text style={{ color: c.ink, fontWeight: '800', fontSize: 17 }}>Guilt-free break ideas</Text>
            {[0, 1, 2].map((k) => {
              const b = BREAK_IDEAS[(idea + k) % BREAK_IDEAS.length];
              return (
                <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                  <Text style={{ color: c.ink, flex: 1, fontSize: 16 }}>{b.text}</Text>
                </View>
              );
            })}
            <Pressable onPress={() => setIdea((i) => (i + 3) % BREAK_IDEAS.length)}><Text style={{ color: c.rose, fontWeight: '700' }}>More ideas ↻</Text></Pressable>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
