import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, H2, Muted } from '../lib/ui';

// Private journal. Stored only on this phone under its own key; never sent to any server.
const KEY = 'rankprep-vent-private';
type Entry = { id: string; at: string; text: string };

const PROMPTS = [
  "What's weighing on you today?",
  'What are you afraid of about the exam?',
  'What do you wish your parents understood?',
  'Write one thing you did well this week.',
];

export default function Vent() {
  const c = useColors();
  const [text, setText] = useState('');
  const [kept, setKept] = useState<Entry[]>([]);
  const [burning, setBurning] = useState(false);
  const [msg, setMsg] = useState('');
  const fire = useRef(new Animated.Value(0)).current;
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((r) => r && setKept(JSON.parse(r))).catch(() => {});
  }, []);
  const save = (list: Entry[]) => {
    setKept(list);
    AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  };

  function burn() {
    if (!text.trim()) return;
    setBurning(true);
    fire.setValue(0);
    Animated.timing(fire, { toValue: 1, duration: 2200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setText('');
      setBurning(false);
      fire.setValue(0); // bring the blank page back
      setMsg('Burnt and gone. 🔥 Nobody will ever read it. Breathe out, you let it go.');
    });
  }

  const paperStyle = {
    opacity: fire.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.4, 0] }),
    transform: [
      { scaleY: fire.interpolate({ inputRange: [0, 1], outputRange: [1, 0.05] }) },
      { translateY: fire.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
    ],
  };
  const flameStyle = {
    opacity: fire.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateY: fire.interpolate({ inputRange: [0, 1], outputRange: [60, -80] }) },
      { scale: fire.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1.6, 1] }) },
    ],
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()}><Text style={{ color: c.rose, fontWeight: '700' }}>← Back</Text></Pressable>
        <H1>Vent box</H1>
        <Muted>Your private space. Write anything: pressure, fear, anger. It stays only on this phone, never online, not even with your account.</Muted>

        <View>
          <Animated.View style={paperStyle}>
            <TextInput
              value={text}
              onChangeText={(t) => { setText(t); setMsg(''); }}
              placeholder={prompt}
              placeholderTextColor={c.mut}
              multiline
              editable={!burning}
              textAlignVertical="top"
              style={{ minHeight: 200, borderWidth: 1.5, borderColor: c.line, borderRadius: 14, padding: 14, fontSize: 17, lineHeight: 24, color: c.ink, backgroundColor: c.card }}
            />
          </Animated.View>
          <Animated.Text pointerEvents="none" style={[{ position: 'absolute', alignSelf: 'center', top: 60, fontSize: 90 }, flameStyle]}>🔥</Animated.Text>
        </View>

        {msg ? <Text style={{ color: c.ok, fontSize: 16 }}>{msg}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn style={{ flex: 1 }} title="🔥 Burn it" disabled={!text.trim() || burning} onPress={burn} />
          <Btn
            style={{ flex: 1 }}
            ghost
            title="Keep privately"
            disabled={!text.trim() || burning}
            onPress={() => {
              save([{ id: String(Date.now()), at: new Date().toISOString(), text: text.trim() }, ...kept]);
              setText('');
              setMsg('Saved on this phone only.');
            }}
          />
        </View>

        <Card style={{ gap: 6, backgroundColor: c.roseT }}>
          <Text style={{ color: c.ink, fontWeight: '700' }}>Feeling really low?</Text>
          <Muted>
            Talk to someone you trust. In India you can call Tele-MANAS free, any time: 14416 or 1-800-891-4416.
          </Muted>
        </Card>

        {kept.length > 0 && (
          <View style={{ gap: 10 }}>
            <H2>Kept notes</H2>
            {kept.map((e) => (
              <Card key={e.id} style={{ gap: 6 }}>
                <Muted>{new Date(e.at).toLocaleString()}</Muted>
                <Text style={{ color: c.ink, fontSize: 16 }}>{e.text}</Text>
                <Pressable onPress={() => save(kept.filter((x) => x.id !== e.id))}><Text style={{ color: c.bad, fontWeight: '600' }}>Delete forever</Text></Pressable>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
