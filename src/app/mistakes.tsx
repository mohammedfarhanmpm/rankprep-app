import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MistakeTag, useApp } from '../lib/app-state';
import { answerLabel, getQuestion, Question, SYLLABUS, subjectLabel } from '../lib/data';
import { RichText } from '../lib/RichText';
import { PipRobot } from '../lib/PipRobot';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, Muted } from '../lib/ui';

const TAGS: { tag: MistakeTag; label: string }[] = [
  { tag: 'silly', label: '🤦 Silly mistake' },
  { tag: 'concept', label: "🧠 Didn't know concept" },
  { tag: 'time', label: '⏱ Ran out of time' },
];
const L = 'ABCD';

export default function Mistakes() {
  const c = useColors();
  const app = useApp();
  const [filter, setFilter] = useState<MistakeTag | 'all' | 'untagged'>('all');
  const byId: Record<string, Question> = {};
  app.mistakes.forEach((m) => {
    const q = getQuestion(m.qid);
    if (q) byId[m.qid] = q;
  });
  const list = app.mistakes.filter((m) => byId[m.qid] && (filter === 'all' || (filter === 'untagged' ? !m.tag : m.tag === filter)));
  const count = (t: MistakeTag) => app.mistakes.filter((m) => m.tag === t).length;

  const chip = (on: boolean) => ({ borderWidth: 1.5, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose : c.card, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <H1>Mistake notebook</H1>
            <Muted>Wrong answers land here automatically. Tag why, then retry. Get it right and it leaves the notebook.</Muted>
          </View>
          <PipRobot mood={app.mistakes.length ? 'think' : 'happy'} size={100} />
        </View>

        {app.mistakes.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TAGS.map((t) => (
                <Card key={t.tag} style={{ flex: 1, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: c.ink }}>{count(t.tag)}</Text>
                  <Muted style={{ fontSize: 12, textAlign: 'center' }}>{t.label.slice(2)}</Muted>
                </Card>
              ))}
            </View>
            <Btn title={`Retry all ${app.mistakes.length} mistakes`} onPress={() => router.navigate({ pathname: '/practice', params: { mode: 'mistakes', t: String(Date.now()) } })} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['all', 'untagged', 'silly', 'concept', 'time'] as const).map((f) => (
                <Pressable key={f} onPress={() => setFilter(f)} style={chip(filter === f)}>
                  <Text style={{ color: filter === f ? '#fff' : c.ink, fontWeight: '600' }}>{f === 'all' ? 'All' : f === 'untagged' ? 'Untagged' : TAGS.find((t) => t.tag === f)!.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {app.mistakes.length === 0 && (
          <Card style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 17 }}>No mistakes saved 🎉</Text>
            <Muted style={{ textAlign: 'center' }}>Take a test. Any question you get wrong will appear here so you can learn from it.</Muted>
          </Card>
        )}

        {list.map((m) => {
          const q = byId[m.qid];
          return (
            <Card key={m.qid} style={{ gap: 10 }}>
              <Muted>{subjectLabel(q.subject)} · {SYLLABUS[q.subject][q.chapter]}</Muted>
              <RichText text={q.text} style={{ color: c.ink, fontSize: 17, fontWeight: '700' }} />
              {q.type === 'mcq' ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Text style={{ color: c.ok, fontWeight: '700' }}>✓ {L[q.answer]})</Text>
                  <View style={{ flex: 1 }}><RichText text={q.options[q.answer]} maxWidth={220} style={{ color: c.ok, fontWeight: '600' }} /></View>
                </View>
              ) : (
                <Text style={{ color: c.ok, fontWeight: '700' }}>✓ Answer: {answerLabel(q)}</Text>
              )}
              <RichText text={q.explanation} style={{ color: c.mut, fontSize: 14 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {TAGS.map((t) => {
                  const on = m.tag === t.tag;
                  return (
                    <Pressable key={t.tag} onPress={() => app.tagMistake(m.qid, on ? undefined : t.tag)} style={{ borderWidth: 1.5, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.roseT : 'transparent', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 }}>
                      <Text style={{ color: c.ink, fontSize: 13 }}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={() => app.removeMistake(m.qid)}><Text style={{ color: c.mut, fontSize: 13 }}>Remove from notebook</Text></Pressable>
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
