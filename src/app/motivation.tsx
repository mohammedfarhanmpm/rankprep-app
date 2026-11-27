import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mood, dayKey, useApp } from '../lib/app-state';
import { MOOD_EMOJI, MOOD_PLAN, motivationFor } from '../lib/motivation';
import { PipRobot } from '../lib/PipRobot';
import { shiftDay } from '../lib/planner';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, H2, Muted } from '../lib/ui';

/** Motivation corner: today's line for the mood, more lines on tap, and 2 weeks of mood history. */
export default function Motivation() {
  const c = useColors();
  const app = useApp();
  const today = dayKey();
  const [n, setN] = useState(0);
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i - 13));
  const counts = Object.entries(
    days.reduce<Record<string, number>>((acc, d) => {
      const m = app.moods[d];
      if (m) acc[m] = (acc[m] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const plan = app.mood ? MOOD_PLAN[app.mood] : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Motivation corner</H1>
        <Card style={{ alignItems: 'center', gap: 10, backgroundColor: c.lav, borderColor: c.lav, paddingVertical: 24 }}>
          <PipRobot mood="talk" size={120} />
          <Text style={{ color: c.lavInk, fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 28 }}>“{motivationFor(app.mood, today, n)}”</Text>
          <Pressable onPress={() => setN(n + 1)}><Text style={{ color: c.lavInk, fontWeight: '700' }}>Another one ↻</Text></Pressable>
        </Card>
        {plan && (
          <Card style={{ gap: 8 }}>
            <H2>{MOOD_EMOJI[app.mood!]} For how you feel today</H2>
            <Text style={{ color: c.ink, fontSize: 16 }}>{plan.text}</Text>
            <Btn ghost title={plan.action} onPress={() => router.push(plan.route as never)} />
          </Card>
        )}
        <Card style={{ gap: 10 }}>
          <H2>Mood · last 2 weeks</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {days.map((d) => (
              <View key={d} style={{ width: '12.5%', aspectRatio: 1, borderRadius: 12, backgroundColor: app.moods[d] ? c.roseT : c.bg, alignItems: 'center', justifyContent: 'center', borderWidth: d === today ? 2 : 0, borderColor: c.rose }}>
                <Text style={{ fontSize: 20 }}>{app.moods[d] ? MOOD_EMOJI[app.moods[d]] : '·'}</Text>
              </View>
            ))}
          </View>
          {counts.length ? <Muted>Most often: {counts.slice(0, 3).map(([m, k]) => `${MOOD_EMOJI[m as Mood]} ${k}`).join('  ')}</Muted> : <Muted>Check in your mood on Home each day.</Muted>}
          {counts[0] && (counts[0][0] === 'stressed' || counts[0][0] === 'tired') && counts[0][1] >= 4 ? (
            <Muted>You've felt {counts[0][0]} often lately. Try the Relax zone, sleep a bit more, and talk to someone you trust. 🤍</Muted>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
