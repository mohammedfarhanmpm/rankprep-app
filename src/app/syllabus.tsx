import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeatColor, useApp } from '../lib/app-state';
import { EXAMS, SYLLABUS, examChapters, subjectLabel } from '../lib/data';
import { useColors } from '../lib/theme';
import { Bar, Card, H1, Muted } from '../lib/ui';

export default function Syllabus() {
  const c = useColors();
  const app = useApp();
  const HEAT: Record<HeatColor, { fill: string; label: string }> = {
    green: { fill: c.ok, label: 'Know it well' },
    yellow: { fill: '#f0b400', label: 'Needs revision' },
    red: { fill: c.bad, label: 'Not studied' },
  };
  const subjects = EXAMS[app.exam].subjects;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Syllabus heat map</H1>
        {EXAMS[app.exam].comingSoon ? <Muted>Chapters for {EXAMS[app.exam].label} are coming soon.</Muted> : null}
        <Muted>{EXAMS[app.exam].label} · tick a chapter when you finish it. Colours also use your test scores and revision dates.</Muted>

        {/* Whole-syllabus heat map at a glance */}
        <Card style={{ gap: 10 }}>
          {subjects.map((s) => (
            <View key={s} style={{ gap: 4 }}>
              <Text style={{ color: c.ink, fontWeight: '700' }}>{subjectLabel(s)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {examChapters(app.exam, s).map((i) => SYLLABUS[s][i]).map((ch, k) => ({ ch, i: examChapters(app.exam, s)[k] })).map(({ ch, i }) => (
                  <View key={ch} accessibilityLabel={`${ch}: ${HEAT[app.heat(s, i).color].label}`} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: HEAT[app.heat(s, i).color].fill }} />
                ))}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
            {(Object.keys(HEAT) as HeatColor[]).map((k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: HEAT[k].fill }} />
                <Muted>{HEAT[k].label}</Muted>
              </View>
            ))}
          </View>
        </Card>

        {subjects.map((s) => {
          const done = app.done[s] ?? [];
          const chs = examChapters(app.exam, s);
          const pct = (chs.filter((i) => done.includes(i)).length / Math.max(1, chs.length)) * 100;
          return (
            <Card key={s} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.ink }}>{subjectLabel(s)}</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.rose }}>{Math.round(pct)}%</Text>
              </View>
              <Bar pct={pct} />
              {chs.map((i) => {
                const ch = SYLLABUS[s][i];
                const on = done.includes(i);
                const h = app.heat(s, i);
                return (
                  <Pressable key={ch} onPress={() => app.toggleChapter(s, i)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
                    <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: HEAT[h.color].fill }} />
                    <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: c.rose, backgroundColor: on ? c.rose : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text>}
                    </View>
                    <Text style={{ flex: 1, color: c.ink, fontSize: 16 }}>{ch}</Text>
                    {h.due && <Text style={{ color: '#b07d00', fontWeight: '700', fontSize: 12 }}>Revise</Text>}
                    {h.pct != null && <Text style={{ color: c.mut, fontSize: 13, fontVariant: ['tabular-nums'] }}>{h.pct}%</Text>}
                  </Pressable>
                );
              })}
            </Card>
          );
        })}
        <Muted>When you tick a chapter, PIP reminds you to revise it after 3, 7 and 21 days.</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
