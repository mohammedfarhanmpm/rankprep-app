import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../lib/app-state';
import { EXAMS } from '../../lib/data';
import { PipMood, PipRobot } from '../../lib/PipRobot';
import { supabase } from '../../lib/supabase';
import { useColors } from '../../lib/theme';
import { Btn, H1, Muted } from '../../lib/ui';

type Msg = { role: 'user' | 'assistant'; content: string; image?: string };
type Photo = { uri: string; base64: string; mime: string };

const STARTERS = [
  'Derive v² = u² + 2as quickly',
  'Difference between SN1 and SN2 reactions',
  'Explain the lac operon simply',
  'Make me a 30-day revision plan',
];

export default function Pip() {
  const c = useColors();
  const app = useApp();
  const params = useLocalSearchParams<{ ask?: string }>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<PipMood>('idle');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const lastAsk = useRef<string | undefined>(undefined);
  const talkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canUse = !!supabase && !!app.session;

  function speak(reply: string, mood: PipMood = 'talk') {
    setMood(mood);
    if (talkTimer.current) clearTimeout(talkTimer.current);
    // Talk roughly as long as it would take to read the start of the answer.
    talkTimer.current = setTimeout(() => setMood('idle'), Math.min(6000, 1200 + reply.length * 15));
  }
  useEffect(() => () => { if (talkTimer.current) clearTimeout(talkTimer.current); }, []);

  async function pickPhoto(camera: boolean) {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setMsgs((m) => [...m, { role: 'assistant', content: camera ? 'I need camera permission to see your question. You can allow it in phone Settings.' : 'I need photo access to read your question.' }]);
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: true };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = r.canceled ? null : r.assets[0];
    if (asset?.base64) setPhoto({ uri: asset.uri, base64: asset.base64, mime: asset.mimeType ?? 'image/jpeg' });
  }

  async function ask(q: string) {
    q = q.trim();
    const img = photo;
    if ((!q && !img) || busy) return;
    if (!q) q = 'Solve the question in this photo step by step.';
    const history: Msg[] = [...msgs, { role: 'user', content: q, image: img?.uri }];
    setMsgs(history);
    setText('');
    setPhoto(null);
    if (!canUse) {
      const reply = 'Sign in to use PIP. Your doubts and my answers are saved to your account.';
      setMsgs([...history, { role: 'assistant', content: reply }]);
      speak(reply, 'sad');
      return;
    }
    setBusy(true);
    setMood('think');
    try {
      const { data, error } = await supabase!.functions.invoke('pip-chat', {
        body: {
          exam: `${EXAMS[app.exam].label}${app.board ? ` (${app.board})` : ''}`,
          messages: history.slice(-12).map(({ role, content }) => ({ role, content })),
          image: img ? { data: img.base64, mediaType: img.mime } : undefined,
        },
      });
      if (error) throw error;
      const reply = data?.reply ?? data?.error ?? 'No answer.';
      setMsgs([...history, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      const reply = "Couldn't reach PIP. Check your internet and try again.";
      setMsgs([...history, { role: 'assistant', content: reply }]);
      speak(reply, 'sad');
    } finally {
      setBusy(false);
    }
  }

  // Questions sent from the Practice screen.
  useEffect(() => {
    if (params.ask && params.ask !== lastAsk.current) {
      lastAsk.current = params.ask;
      ask(params.ask);
    }
  }, [params.ask]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flex: 1, gap: 4 }}>
            <H1>Ask PIP</H1>
            <Muted>{busy ? 'PIP is thinking…' : mood === 'talk' ? 'PIP is explaining…' : 'Type a doubt or send a photo of the question.'}</Muted>
          </View>
          <PipRobot mood={mood} size={120} />
        </View>
        <ScrollView ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd()} contentContainerStyle={{ padding: 18, gap: 10 }}>
          <View style={{ backgroundColor: c.roseT, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <Text style={{ color: c.rose, fontWeight: '800', marginBottom: 4 }}>PIP</Text>
            <Text style={{ color: c.ink, fontSize: 16 }}>Hi! I solve Physics, Chemistry, Maths and Biology doubts step by step. You can ask in English or Malayalam, or snap a photo of the question.</Text>
          </View>
          {msgs.length === 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {STARTERS.map((s) => (
                <Pressable key={s} onPress={() => ask(s)} style={{ borderWidth: 1.5, borderColor: c.line, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ color: c.ink }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.rose, borderRadius: 12, padding: 12, gap: 8 }}>
                {m.image && <Image source={{ uri: m.image }} style={{ width: 200, height: 150, borderRadius: 8 }} resizeMode="cover" />}
                <Text style={{ color: '#fff', fontSize: 16 }}>{m.content}</Text>
              </View>
            ) : (
              <View key={i} style={{ backgroundColor: c.roseT, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: c.rose, fontWeight: '800', marginBottom: 4 }}>PIP</Text>
                <Text selectable style={{ color: c.ink, fontSize: 16, lineHeight: 23 }}>{m.content}</Text>
              </View>
            ),
          )}
        </ScrollView>
        {photo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 8 }}>
            <Image source={{ uri: photo.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
            <Muted style={{ flex: 1 }}>Photo attached. Add a note or just tap Ask.</Muted>
            <Pressable onPress={() => setPhoto(null)}><Text style={{ color: c.bad, fontWeight: '700' }}>Remove</Text></Pressable>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-end', backgroundColor: c.bg }}>
          <Pressable accessibilityLabel="Take photo of question" onPress={() => pickPhoto(true)} onLongPress={() => pickPhoto(false)} style={{ width: 48, height: 48, borderRadius: 10, borderWidth: 2, borderColor: c.rose, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>📷</Text>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type your doubt…"
            placeholderTextColor={c.mut}
            multiline
            style={{ flex: 1, borderWidth: 1.5, borderColor: c.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: c.ink, maxHeight: 120, minHeight: 48 }}
          />
          <Btn title="Ask" onPress={() => ask(text)} disabled={busy || (!text.trim() && !photo)} />
        </View>
        <Muted style={{ paddingHorizontal: 12, paddingBottom: 8 }}>📷 tap: camera · hold: gallery. AI answers can be wrong; check with NCERT.</Muted>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
