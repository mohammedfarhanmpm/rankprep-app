import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { EXAMS, Subject, subjectLabel } from '../lib/data';
import { FORMULAS } from '../lib/formulas';
import { useColors } from '../lib/theme';
import { Card, H1, Muted } from '../lib/ui';

export default function Formulas() {
  const c = useColors();
  const app = useApp();
  const subjects = EXAMS[app.exam].subjects;
  const [subject, setSubject] = useState<Subject>(subjects[0]);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Formula sheets</H1>
        <Muted>Quick revision, works offline. {subject === 'Biology' ? 'Biology shows key facts.' : 'Tap a chapter to open it.'}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {subjects.map((s) => {
            const on = s === subject;
            return (
              <Pressable key={s} onPress={() => { setSubject(s); setOpen(0); }} style={{ borderWidth: 1.5, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose : c.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 }}>
                <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '600' }}>{subjectLabel(s)}</Text>
              </Pressable>
            );
          })}
        </View>
        {FORMULAS[subject].map((ch, i) => (
          <Card key={ch.chapter} style={{ padding: 0, overflow: 'hidden' }}>
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: c.ink, fontWeight: '800', fontSize: 17 }}>{ch.chapter}</Text>
              <Text style={{ color: c.rose, fontWeight: '800' }}>{open === i ? '−' : '+'}</Text>
            </Pressable>
            {open === i &&
              ch.items.map(([name, f]) => (
                <View key={name} style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, gap: 2 }}>
                  <Muted>{name}</Muted>
                  <Text selectable style={{ color: c.ink, fontSize: 17, fontWeight: '600' }}>{f}</Text>
                </View>
              ))}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
