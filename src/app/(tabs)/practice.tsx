import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tally, useApp } from '../../lib/app-state';
import { Answer, Difficulty, EXAMS, QUICK, Question, SYLLABUS, Subject, TestSpec, answerLabel, buildTest, isCorrect, isSkipped, examChapters, questionCount, score, subjectCount, subjectLabel } from '../../lib/data';
import { Confetti } from '../../lib/Confetti';
import { RichText } from '../../lib/RichText';
import { PipMood, PipRobot } from '../../lib/PipRobot';
import { useColors } from '../../lib/theme';
import { Bar, Btn, Card, H1, H2, Muted } from '../../lib/ui';

const L = 'ABCD';
/** Question text for PIP: figures become a placeholder. */
const plain = (s: string) => s.replace(/\[\[img:[0-9a-f]+\]\]/g, '[figure]');
const SECONDS_PER_Q = 72; // ~ NTA pace: 180 min / 150 questions

function specLabel(spec: TestSpec): string {
  if (spec.kind === 'mixed') return 'Mixed test';
  if (spec.kind === 'quick') return 'Quick mini test';
  if (spec.kind === 'ids') return spec.label;
  if (spec.kind === 'rush') return 'Exam Rush';
  if (spec.kind === 'subject') return `${spec.subject} test`;
  return SYLLABUS[spec.subject][spec.chapter];
}

export default function Practice() {
  const app = useApp();
  const params = useLocalSearchParams<{ subject?: string; chapter?: string; mode?: string; t?: string }>();
  const [spec, setSpec] = useState<TestSpec | null>(null);
  const [diff, setDiff] = useState<Difficulty | undefined>(undefined);
  const [run, setRun] = useState(0);

  // Deep link from Home "weak chapters": start that chapter test.
  const lastParam = useRef('');
  useEffect(() => {
    const key = `${params.subject}|${params.chapter}`;
    if (params.subject && params.chapter != null && key !== lastParam.current) {
      lastParam.current = key;
      setSpec({ kind: 'chapter', subject: params.subject as Subject, chapter: +params.chapter });
      setRun((r) => r + 1);
    }
  }, [params.subject, params.chapter]);

  // Deep links: ?mode=quick or ?mode=mistakes (t makes each tap unique).
  const lastMode = useRef('');
  useEffect(() => {
    const key = `${params.mode}|${params.t}`;
    if (!params.mode || key === lastMode.current) return;
    lastMode.current = key;
    if (params.mode === 'quick') setSpec({ kind: 'quick' });
    else if (params.mode === 'mistakes') setSpec({ kind: 'ids', ids: app.mistakes.map((m) => m.qid), label: 'Mistake retry' });
    else if (params.mode === 'rush') setSpec({ kind: 'rush', chapters: app.weak.map((w) => ({ subject: w.subject, chapter: w.chapter })), ids: app.mistakes.map((m) => m.qid) });
    setRun((r) => r + 1);
  }, [params.mode, params.t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back to setup when the exam is switched.
  const examRef = useRef(app.exam);
  useEffect(() => {
    if (examRef.current !== app.exam) {
      examRef.current = app.exam;
      setSpec(null);
    }
  }, [app.exam]);

  if (!spec) return <Setup diff={diff} setDiff={setDiff} onStart={(s) => { setSpec(s); setRun((r) => r + 1); }} />;
  return <Test key={run} spec={spec} diff={diff} onNew={() => setSpec(null)} onAgain={() => setRun((r) => r + 1)} />;
}

function Setup({ onStart, diff, setDiff }: { onStart: (s: TestSpec) => void; diff?: Difficulty; setDiff: (d?: Difficulty) => void }) {
  const c = useColors();
  const app = useApp();
  const subjects = EXAMS[app.exam].subjects;
  const [picked, setSubject] = useState<Subject>(subjects[0]);
  // The exam can change (or load from storage) after mount; fall back to its first subject.
  const subject = subjects.includes(picked) ? picked : subjects[0];
  const chip = (on: boolean) => ({ borderWidth: 1.5, borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose : c.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 });

  if (EXAMS[app.exam].comingSoon) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <H1>Practice</H1>
          <Card style={{ alignItems: 'center', gap: 8 }}>
            <PipRobot mood="think" size={140} />
            <Text style={{ color: c.ink, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>{EXAMS[app.exam].label} questions are coming soon</Text>
            <Muted style={{ textAlign: 'center' }}>We're adding {app.board ?? 'your board'} questions for {EXAMS[app.exam].label}. Meanwhile, use the focus timer, flashcards and Ask PIP.</Muted>
          </Card>
          <Btn ghost title="Change class" onPress={() => router.push({ pathname: '/onboarding', params: { change: '1' } })} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <H1>Practice</H1>
        <Muted>{EXAMS[app.exam].subjects.map((s) => `${subjectLabel(s)} ${subjectCount(s, app.exam).toLocaleString()}`).join(' · ')} questions · {EXAMS[app.exam].label}</Muted>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Muted>Difficulty:</Muted>
          {([undefined, 'Easy', 'Moderate', 'Hard'] as const).map((d) => (
            <Pressable key={d ?? 'all'} onPress={() => setDiff(d)} style={chip(diff === d)}>
              <Text style={{ color: diff === d ? '#fff' : c.ink, fontWeight: '600' }}>{d ?? 'All'}</Text>
            </Pressable>
          ))}
        </View>
        <Card style={{ gap: 10, borderColor: c.rose }}>
          <H2>⚡ Quick mini test</H2>
          <Muted>{QUICK.count} questions · {QUICK.seconds / 60} minutes. Perfect when you're short on time.</Muted>
          <Btn title="Start quick test" onPress={() => onStart({ kind: 'quick' })} />
        </Card>

        {app.mistakes.length > 0 && (
          <Card style={{ gap: 10 }}>
            <H2>📕 Retry your mistakes</H2>
            <Muted>{app.mistakes.length} question{app.mistakes.length === 1 ? '' : 's'} in your mistake notebook. Get one right and it leaves the notebook.</Muted>
            <Btn ghost title="Retry mistakes" onPress={() => onStart({ kind: 'ids', ids: app.mistakes.map((m) => m.qid), label: 'Mistake retry' })} />
          </Card>
        )}

        <Card style={{ gap: 10 }}>
          <H2>Full mixed test</H2>
          <Muted>{subjects.map(subjectLabel).join(' · ')} · {subjects.length * 4} questions · timed</Muted>
          <Btn title="Start mixed test" onPress={() => onStart({ kind: 'mixed' })} />
        </Card>

        <Card style={{ gap: 12 }}>
          <H2>Subject or chapter test</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {subjects.map((s) => (
              <Pressable key={s} onPress={() => setSubject(s)} style={chip(s === subject)}>
                <Text style={{ color: s === subject ? '#fff' : c.ink, fontWeight: '600' }}>{subjectLabel(s)}</Text>
              </Pressable>
            ))}
          </View>
          <Btn ghost title={`Whole ${subjectLabel(subject)} test`} onPress={() => onStart({ kind: 'subject', subject })} />
          <Muted>Or pick a chapter:</Muted>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {examChapters(app.exam, subject).map((i) => {
              const name = SYLLABUS[subject][i];
              const n = questionCount(subject, i);
              return (
                <Pressable key={name} disabled={!n} onPress={() => onStart({ kind: 'chapter', subject, chapter: i })} style={[chip(false), { opacity: n ? 1 : 0.45 }]}>
                  <Text style={{ color: c.ink }}>{name}{n ? ` · ${n}` : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Muted>Faded chapters have no questions yet.</Muted>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Test({ spec, diff, onNew, onAgain }: { spec: TestSpec; diff?: Difficulty; onNew: () => void; onAgain: () => void }) {
  const c = useColors();
  const app = useApp();
  const [test] = useState<Question[]>(() => buildTest(app.exam, spec, diff));
  const [answers, setAnswers] = useState<(Answer | undefined)[]>([]);
  const [numText, setNumText] = useState('');
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(spec.kind === 'quick' ? QUICK.seconds : test.length * SECONDS_PER_Q);
  const [mood, setMood] = useState<PipMood>('idle');
  const saved = useRef(false);
  // best earlier score (%) for this kind of test, to spot a personal best
  const [prevBest] = useState(() => {
    const xs = app.attempts.filter((a) => a.exam === app.exam && a.label === specLabel(spec)).map((a) => a.marks / Math.max(1, a.max));
    return xs.length ? Math.max(...xs) : null;
  });

  const finished = idx >= test.length || left <= 0;

  if (test.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 18, gap: 14 }}>
        <H1>No questions</H1>
        <Muted>No questions match this choice. Try another difficulty or chapter.</Muted>
        <Btn title="Back to tests" onPress={onNew} />
      </SafeAreaView>
    );
  }
  const sc = score(test, answers);

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  useEffect(() => {
    if (!finished || saved.current) return;
    saved.current = true;
    const bySubject: Record<string, Tally> = {};
    const byChapter: Record<string, Tally> = {};
    test.forEach((q, i) => {
      const ok = isCorrect(q, answers[i]) ? 1 : 0;
      const b = (bySubject[q.subject] ??= { correct: 0, total: 0 });
      const ch = (byChapter[`${q.subject}|${q.chapter}`] ??= { correct: 0, total: 0 });
      b.total++; ch.total++;
      b.correct += ok; ch.correct += ok;
    });
    app.addAttempt({ exam: app.exam, label: specLabel(spec), marks: sc.marks, max: sc.max, correct: sc.correct, wrong: sc.wrong, skipped: sc.skipped, bySubject, byChapter });
    setMood(sc.marks / sc.max >= 0.5 ? 'happy' : 'sad');
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (finished) {
    const per: Record<string, { ok: number; n: number }> = {};
    test.forEach((q, i) => {
      const p = (per[q.subject] ??= { ok: 0, n: 0 });
      p.n++;
      if (isCorrect(q, answers[i])) p.ok++;
    });
    const pct = sc.marks / Math.max(1, sc.max);
    const good = pct >= 0.5;
    const best = prevBest != null && pct > prevBest && sc.correct > 0;
    const celebrate = pct >= 0.8 || best;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
          <H1>Result</H1>
          <Card style={{ alignItems: 'center', gap: 4 }}>
            <PipRobot mood={mood} size={150} />
            <Text style={{ color: c.ink, fontWeight: '700' }}>{good ? 'Super! PIP is proud of you.' : "Don't worry, PIP will help you revise."}</Text>
            <Muted>{left <= 0 ? "Time's up! " : ''}{specLabel(spec)}</Muted>
            <Text style={{ fontSize: 64, fontWeight: '800', color: c.rose, letterSpacing: -2 }}>
              {sc.marks}
              <Text style={{ fontSize: 26, color: c.mut }}> / {sc.max}</Text>
            </Text>
            <Text style={{ color: c.ink }}>{sc.correct} correct · {sc.wrong} wrong · {sc.skipped} skipped</Text>
            <Text style={{ color: c.ok, fontWeight: '700', marginTop: 4 }}>+{sc.correct * 12 + sc.wrong * 2} XP</Text>
            {celebrate && <Text style={{ color: c.rose, fontWeight: '800', fontSize: 18, marginTop: 4 }}>{best ? '🏆 New personal best!' : '🌟 Top score! Amazing!'}</Text>}
          </Card>
          <Card style={{ gap: 12 }}>
            {Object.entries(per).map(([s, v]) => (
              <View key={s} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: c.ink, fontWeight: '600' }}>{subjectLabel(s as Subject)}</Text>
                  <Text style={{ color: c.ink }}>{v.ok}/{v.n}</Text>
                </View>
                <Bar pct={(v.ok / v.n) * 100} />
              </View>
            ))}
          </Card>
          <Btn title="Try again" onPress={onAgain} />
          <Btn ghost title="Choose another test" onPress={onNew} />
        </ScrollView>
        {celebrate && <Confetti />}
      </SafeAreaView>
    );
  }

  const q = test[idx];
  const a = answers[idx];
  const locked = a !== undefined;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const ok = isCorrect(q, a);

  function lock(v: Answer) {
    const n = [...answers];
    n[idx] = v;
    setAnswers(n);
    if (!isSkipped(v)) {
      const right = isCorrect(q, v);
      app.recordAnswer(right);
      // Mistake notebook: wrong answers go in, a correct retry takes them out.
      if (right) app.removeMistake(q.id);
      else app.addMistake(q.id);
      setMood(right ? 'happy' : 'sad');
    } else setMood('idle');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={onNew}><Text style={{ color: c.rose, fontWeight: '700' }}>← Tests</Text></Pressable>
          <Text style={{ color: left < 60 ? c.bad : c.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>⏱ {mm}:{ss}</Text>
          <Text style={{ color: c.ink, fontWeight: '800' }}>{sc.marks} marks</Text>
        </View>

        {/* OMR strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {test.map((t, i) => {
            const v = answers[i];
            const bg = v === undefined ? c.card : isSkipped(v) ? c.roseT : isCorrect(t, v) ? c.ok : c.bad;
            const fg = v === undefined || isSkipped(v) ? c.rose : '#fff';
            return (
              <View key={t.id} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: i === idx ? 3 : 2, borderColor: i === idx ? c.rose : v !== undefined && !isSkipped(v) ? bg : c.line, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{i + 1}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: c.roseT, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ color: c.rose, fontWeight: '600' }}>{subjectLabel(q.subject)}</Text>
              </View>
              <Muted>Q {idx + 1}/{test.length} · {q.difficulty}{q.type === 'numerical' ? ' · Numerical' : ''}</Muted>
            </View>
            <Muted>{SYLLABUS[q.subject][q.chapter]}{q.topic ? ` · ${q.topic}` : ''}</Muted>
          </View>
          <PipRobot mood={mood} size={84} />
        </View>

        <RichText text={q.text} style={{ fontSize: 19, fontWeight: '700', color: c.ink, lineHeight: 27 }} />

        {q.type === 'numerical' && (
          <View style={{ gap: 8 }}>
            <TextInput
              value={locked ? String(isSkipped(a!) ? '' : a) : numText}
              onChangeText={setNumText}
              editable={!locked}
              keyboardType="numbers-and-punctuation"
              placeholder="Type your answer (a number)"
              placeholderTextColor={c.mut}
              style={{ borderWidth: 2, borderColor: locked ? (ok ? c.ok : c.bad) : c.rose, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '700', color: c.ink, backgroundColor: locked ? (ok ? c.okT : c.badT) : c.card }}
            />
          </View>
        )}

        <View style={{ gap: 10 }}>
          {q.options.map((o, i) => {
            let border = c.line, bg = c.card, bub = 'transparent', bubText = c.rose;
            if (locked) {
              if (i === q.answer) [border, bg, bub, bubText] = [c.ok, c.okT, c.ok, '#fff'];
              else if (i === a) [border, bg, bub, bubText] = [c.bad, c.badT, c.bad, '#fff'];
            } else if (i === picked) [bub, bubText, border] = [c.rose, '#fff', c.rose];
            return (
              <Pressable key={i} disabled={locked} onPress={() => setPicked(i)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: border, backgroundColor: bg, borderRadius: 12, padding: 12, minHeight: 56 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: bub === 'transparent' ? c.rose : bub, backgroundColor: bub, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: bubText, fontWeight: '700' }}>{L[i]}</Text>
                </View>
                <View style={{ flex: 1 }}><RichText text={o} maxWidth={240} style={{ fontSize: 17, color: c.ink }} /></View>
              </Pressable>
            );
          })}
        </View>

        {locked && (
          <View style={{ borderLeftWidth: 4, borderLeftColor: ok ? c.ok : c.bad, backgroundColor: ok ? c.okT : c.badT, padding: 12, borderRadius: 6, gap: 8 }}>
            <Text style={{ color: c.ink, fontWeight: '800' }}>
              {isSkipped(a!) ? 'Skipped (0). ' : ok ? 'Correct! +4. ' : 'Wrong −1. '}Answer: {answerLabel(q)}
            </Text>
            {q.explanation ? <RichText text={q.explanation} style={{ color: c.ink, fontSize: 15, lineHeight: 22 }} /> : null}
            {q.aiSolution ? <Muted style={{ fontSize: 12 }}>🤖 AI explanation based on the official answer key. Check with NCERT if unsure.</Muted> : null}
            <Pressable
              onPress={() =>
                router.navigate({
                  pathname: '/pip',
                  params: { ask: `Explain this ${subjectLabel(q.subject)} question in detail, with the concept${q.type === 'mcq' ? ' and why the other options are wrong' : ''}:\n${plain(q.text)}\n${q.options.map((o, i) => `${L[i]}) ${plain(o)}`).join('  ')}\nCorrect answer: ${answerLabel(q)}` },
                })
              }
            >
              <Text style={{ color: c.rose, fontWeight: '700' }}>Explain in detail with PIP →</Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {locked ? (
            <Btn style={{ flex: 1 }} title={idx === test.length - 1 ? 'See result' : 'Next question'} onPress={() => { setIdx(idx + 1); setPicked(null); setNumText(''); setMood('idle'); }} />
          ) : (
            <>
              <Btn
                style={{ flex: 2 }}
                title="Submit answer"
                disabled={q.type === 'numerical' ? !numText.trim() : picked == null}
                onPress={() => (q.type === 'numerical' ? numText.trim() && lock(numText.trim()) : picked != null && lock(picked))}
              />
              <Btn style={{ flex: 1 }} ghost title="Skip" onPress={() => lock(-1)} />
            </>
          )}
        </View>
        <Muted>NTA marking: +4 correct, −1 wrong, 0 skipped.</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
