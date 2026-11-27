import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PipRobot } from '../lib/PipRobot';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, H2, Muted, Segmented } from '../lib/ui';

// Box-style calming breath: in 4 s, hold 4 s, out 6 s. 2 minutes ≈ 8 rounds.
const PHASES = [
  { label: 'Breathe in', secs: 4, to: 1 },
  { label: 'Hold', secs: 4, to: 1 },
  { label: 'Breathe out', secs: 6, to: 0 },
];
const ROUNDS = 8;

const EYE_STEPS = [
  { secs: 20, text: 'Look at something about 20 feet (6 m) away. Out of the window is perfect.' },
  { secs: 10, text: 'Blink slowly 10 times.' },
  { secs: 15, text: 'Roll your eyes in a slow circle, then the other way.' },
  { secs: 15, text: 'Rub your palms warm and rest them over closed eyes.' },
];

export default function Relax() {
  const c = useColors();
  const [tab, setTab] = useState<'breath' | 'eyes'>('breath');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Relax zone</H1>
        <Muted>Tired of studying? Take 2 minutes with PIP. Your brain remembers more after a real break.</Muted>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'breath', label: '🌬️ Breathing' }, { value: 'eyes', label: '👀 Eye break' }]} />
        {tab === 'breath' ? <Breathing /> : <EyeBreak />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Breathing() {
  const c = useColors();
  const scale = useRef(new Animated.Value(0)).current;
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [round, setRound] = useState(0);
  const [secs, setSecs] = useState(PHASES[0].secs);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    const p = PHASES[phase];
    setSecs(p.secs);
    Animated.timing(scale, { toValue: p.to, duration: p.secs * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
    const tick = setInterval(() => setSecs((s) => Math.max(1, s - 1)), 1000);
    const next = setTimeout(() => {
      if (phase === PHASES.length - 1) {
        if (round + 1 >= ROUNDS) {
          setRunning(false);
          setDone(true);
          setRound(0);
        } else setRound(round + 1);
        setPhase(0);
      } else setPhase(phase + 1);
    }, p.secs * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(next);
    };
  }, [running, phase, round, scale]);

  const s = scale.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.15] });

  return (
    <Card style={{ alignItems: 'center', gap: 14, paddingVertical: 28 }}>
      <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: c.roseT, borderWidth: 3, borderColor: c.line, transform: [{ scale: s }] }} />
        <PipRobot mood={done ? 'happy' : 'idle'} size={170} />
      </View>
      <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>
        {done ? 'Well done! 💚' : running ? `${PHASES[phase].label} · ${secs}` : 'Ready?'}
      </Text>
      <Muted>{running ? `Round ${round + 1} of ${ROUNDS}` : done ? 'Feel lighter? Back to work with a fresh mind.' : 'Follow the circle: in 4 · hold 4 · out 6. About 2 minutes.'}</Muted>
      <Btn
        style={{ alignSelf: 'stretch' }}
        ghost={running}
        title={running ? 'Stop' : done ? 'Again' : 'Start breathing'}
        onPress={() => {
          if (running) {
            setRunning(false);
            scale.stopAnimation();
            scale.setValue(0);
          } else {
            setDone(false);
            setPhase(0);
            setRound(0);
            setRunning(true);
          }
        }}
      />
    </Card>
  );
}

function EyeBreak() {
  const c = useColors();
  const [step, setStep] = useState(-1);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (step < 0 || step >= EYE_STEPS.length) return;
    setSecs(EYE_STEPS[step].secs);
    const t = setInterval(() => setSecs((s) => s - 1), 1000);
    const n = setTimeout(() => setStep(step + 1), EYE_STEPS[step].secs * 1000);
    return () => {
      clearInterval(t);
      clearTimeout(n);
    };
  }, [step]);

  const finished = step >= EYE_STEPS.length;
  return (
    <Card style={{ gap: 14 }}>
      <H2>20-20-20 eye break</H2>
      <Muted>Every 20 minutes of screen time, look 20 feet away for 20 seconds. Here's a 1-minute routine.</Muted>
      {EYE_STEPS.map((e, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', opacity: step === i ? 1 : 0.55 }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: step > i || finished ? c.ok : step === i ? c.rose : c.roseT, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: step >= i || finished ? '#fff' : c.rose, fontWeight: '800' }}>{step > i || finished ? '✓' : step === i ? secs : i + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: c.ink, fontSize: 16 }}>{e.text}</Text>
        </View>
      ))}
      <Btn title={finished ? 'Done! Again?' : step >= 0 ? 'Running…' : 'Start eye break'} disabled={step >= 0 && !finished} onPress={() => setStep(0)} />
    </Card>
  );
}
