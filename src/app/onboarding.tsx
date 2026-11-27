import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { BOARDS, Board, EXAMS, Exam } from '../lib/data';
import { PipRobot } from '../lib/PipRobot';
import { useColors } from '../lib/theme';
import { Btn, H1, H2, Muted } from '../lib/ui';

const SCHOOL: Exam[] = ['C8', 'C9', 'C10', 'C11', 'C12'];
const ENTRANCE: Exam[] = ['JEE', 'NEET'];
const SUB: Record<Exam, string> = {
  C8: 'High school', C9: 'High school', C10: 'SSLC / Board', C11: 'Class 11', C12: 'Class 12',
  JEE: 'Engineering entrance', NEET: 'Medical entrance',
};

/** First-launch (and "change class") screen: pick a class or entrance exam, and the school board. */
export default function Onboarding() {
  const c = useColors();
  const app = useApp();
  const { change } = useLocalSearchParams<{ change?: string }>();
  const [exam, setExam] = useState<Exam | null>(app.onboarded ? app.exam : null);
  const [board, setBoard] = useState<Board | null>(app.board);
  const needsBoard = exam != null && EXAMS[exam].group === 'School';
  const ready = exam != null && (!needsBoard || board != null);

  const tile = (e: Exam) => {
    const on = e === exam;
    return (
      <Pressable
        key={e}
        onPress={() => setExam(e)}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        style={{ width: '31%', flexGrow: 1, minWidth: 96, borderWidth: 2, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.roseT : c.card, borderRadius: 14, padding: 12, gap: 2 }}
      >
        <Text style={{ color: c.ink, fontWeight: '800', fontSize: 17 }}>{EXAMS[e].label}</Text>
        <Text style={{ color: c.mut, fontSize: 12 }}>{SUB[e]}</Text>
        {EXAMS[e].comingSoon && <Text style={{ color: c.rose, fontSize: 11, fontWeight: '700' }}>Questions soon</Text>}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        {change ? <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 6 }}>
            <H1>{change ? 'Change class' : "Hi! I'm PIP"}</H1>
            <Muted>Which class are you in? I'll show the right chapters and questions.</Muted>
          </View>
          <PipRobot mood="happy" size={110} />
        </View>

        <H2>School</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{SCHOOL.map(tile)}</View>
        <H2>Entrance exams</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{ENTRANCE.map(tile)}</View>

        {needsBoard && (
          <View style={{ gap: 10 }}>
            <H2>Board / syllabus</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {BOARDS.map((b) => {
                const on = b === board;
                return (
                  <Pressable key={b} onPress={() => setBoard(b)} style={{ borderWidth: 2, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose : c.card, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16 }}>
                    <Text style={{ color: on ? '#fff' : c.ink, fontWeight: '700' }}>{b}</Text>
                  </Pressable>
                );
              })}
            </View>
            {exam === 'C11' || exam === 'C12' ? (
              <Muted>Plus One and Plus Two follow NCERT books in Kerala SCERT and CBSE, so you get NCERT chapter-wise questions.</Muted>
            ) : null}
          </View>
        )}

        <Btn
          title={ready ? `Continue as ${EXAMS[exam!].label}${needsBoard ? ` · ${board}` : ''}` : 'Choose your class'}
          disabled={!ready}
          onPress={() => {
            app.setTrack(exam!, needsBoard ? board : null);
            if (change) router.back();
            else router.replace('/home');
          }}
        />
        <Muted style={{ textAlign: 'center' }}>You can change this any time from Home.</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
