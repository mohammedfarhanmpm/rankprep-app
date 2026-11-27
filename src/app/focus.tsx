import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dayKey, useApp } from '../lib/app-state';
import { motivationFor } from '../lib/motivation';
import { PipRobot } from '../lib/PipRobot';
import { usePlanner } from '../lib/planner';

const LENGTHS = [25, 50, 90];
const BG = '#2b2433';
const INK = '#f6eef7';
const SOFT = '#c7b8d6';
const ACCENT = '#f4a3bf';

/**
 * Full-screen focus mode: the screen stays on, the session is distraction-free,
 * and leaving early needs a 2-second press. Finished minutes count towards Progress.
 */
export default function FocusMode() {
  useKeepAwake();
  const app = useApp();
  const { addFocus, p } = usePlanner();
  const [len, setLen] = useState(50);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(len * 60);
  const [doneMsg, setDoneMsg] = useState('');
  const startedAt = useRef<number | null>(null);
  const hold = useRef(new Animated.Value(0)).current;
  const todayMin = p.focus[dayKey()] ?? 0;

  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const l = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(t);
        addFocus(dayKey(), len);
        setEndAt(null);
        setDoneMsg(`🎉 ${len} minutes of deep focus! Take a 5–10 minute break.`);
      }
    }, 500);
    return () => clearInterval(t);
  }, [endAt, len, addFocus]);

  const running = endAt != null;
  const start = () => {
    setDoneMsg('');
    startedAt.current = Date.now();
    setLeft(len * 60);
    setEndAt(Date.now() + len * 60 * 1000);
  };
  const leave = () => {
    if (running && startedAt.current) {
      const mins = Math.floor((Date.now() - startedAt.current) / 60000);
      if (mins > 0) addFocus(dayKey(), mins); // partial session still counts
    }
    router.back();
  };
  const holdStart = () => {
    if (!running) return leave();
    Animated.timing(hold, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => finished && leave());
  };
  const holdEnd = () => {
    hold.stopAnimation();
    hold.setValue(0);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = running ? 1 - left / (len * 60) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ color: SOFT, fontWeight: '700', letterSpacing: 1 }}>FOCUS MODE</Text>
          <Text style={{ color: SOFT, textAlign: 'center' }}>{motivationFor(app.mood, dayKey(), 3)}</Text>
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <PipRobot mood={running ? 'think' : doneMsg ? 'happy' : 'idle'} size={150} />
          <Text style={{ color: INK, fontSize: 84, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -2 }}>{mm}:{ss}</Text>
          <View style={{ width: '80%', height: 8, borderRadius: 4, backgroundColor: '#ffffff22', overflow: 'hidden' }}>
            <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: ACCENT }} />
          </View>
          {doneMsg ? <Text style={{ color: INK, textAlign: 'center', fontSize: 16 }}>{doneMsg}</Text> : null}
          {!running && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {LENGTHS.map((m) => (
                <Pressable key={m} onPress={() => { setLen(m); setLeft(m * 60); }} style={{ borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: m === len ? ACCENT : '#ffffff14' }}>
                  <Text style={{ color: m === len ? BG : INK, fontWeight: '800' }}>{m} min</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={{ color: SOFT }}>Today: {Math.floor(todayMin / 60)} h {todayMin % 60} min focused</Text>
        </View>

        <View style={{ gap: 12 }}>
          {!running && (
            <Pressable onPress={start} style={{ backgroundColor: ACCENT, borderRadius: 18, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: BG, fontWeight: '800', fontSize: 17 }}>Start {len}-minute focus</Text>
            </Pressable>
          )}
          <Pressable onPressIn={holdStart} onPressOut={holdEnd} style={{ borderRadius: 18, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#ffffff33', overflow: 'hidden' }}>
            <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#ffffff22', width: hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            <Text style={{ color: SOFT, fontWeight: '700' }}>{running ? 'Hold 2 seconds to stop' : 'Exit'}</Text>
          </Pressable>
          <Text style={{ color: '#9d90ab', fontSize: 12, textAlign: 'center' }}>Tip: turn on Do Not Disturb on your phone for a fully quiet session.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
