import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { EXAMS, Subject, subjectLabel } from '../lib/data';
import { FORMULAS } from '../lib/formulas';

type CardT = { key: string; subject: Subject; chapter: string; title: string; body: string };

// One bold colour per subject, so cards feel like reels.
const BG: Record<Subject, [string, string]> = {
  Physics: ['#e2efff', '#3b6fb8'],
  Chemistry: ['#ffe9dc', '#c06a3b'],
  Maths: ['#ece6ff', '#6a55b8'],
  Biology: ['#dff5ea', '#2f8a62'],
  'NEET Physics': ['#e2efff', '#3b6fb8'],
  'NEET Chemistry': ['#ffe9dc', '#c06a3b'],
};

export default function Flashcards() {
  const app = useApp();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const subjects = EXAMS[app.exam].subjects;
  const [subject, setSubject] = useState<Subject | 'All'>('All');
  const [seed] = useState(() => Math.random());

  const cards = useMemo(() => {
    const all: CardT[] = (subject === 'All' ? subjects : [subject]).flatMap((s) =>
      FORMULAS[s].flatMap((ch) => ch.items.map(([title, body]) => ({ key: `${s}${ch.chapter}${title}`, subject: s, chapter: ch.chapter, title, body }))),
    );
    // Stable shuffle so cards don't jump while scrolling.
    let x = Math.floor(seed * 2147483646) + 1;
    return all.map((c) => ({ c, r: (x = (x * 16807) % 2147483647) })).sort((a, b) => a.r - b.r).map((o) => o.c);
  }, [subject, subjects, seed]);

  const h = height;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff8fb' }}>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.key}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
        renderItem={({ item, index }) => {
          const [bg, accent] = BG[item.subject];
          return (
            <View style={{ height: h, width, backgroundColor: bg, justifyContent: 'center', padding: 28, gap: 18 }}>
              <Text style={{ color: accent, fontWeight: '700', fontSize: 15 }}>{subjectLabel(item.subject)} · {item.chapter}</Text>
              <Text style={{ color: '#3b3346', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>{item.title}</Text>
              <Text selectable style={{ color: accent, fontSize: 34, fontWeight: '800', lineHeight: 44 }}>{item.body}</Text>
              <Text style={{ color: '#3b334699', fontSize: 14, position: 'absolute', bottom: insets.bottom + 28, left: 28 }}>
                {index + 1} / {cards.length} · swipe up for next
              </Text>
            </View>
          );
        }}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 6, flexWrap: 'wrap' }}>
          <Pressable onPress={() => router.back()} style={{ paddingVertical: 6, paddingRight: 6 }}>
            <Text style={{ color: '#3b3346', fontWeight: '800', fontSize: 16 }}>✕</Text>
          </Pressable>
          {(['All', ...subjects] as const).map((s) => {
            const on = s === subject;
            return (
              <Pressable key={s} onPress={() => setSubject(s)} style={{ borderWidth: 1.5, borderColor: '#3b3346', backgroundColor: on ? '#3b3346' : '#ffffffaa', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
                <Text style={{ color: on ? '#fff' : '#3b3346', fontWeight: '600' }}>{s === 'All' ? s : subjectLabel(s)}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}
