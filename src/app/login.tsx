import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';
import { Btn, Card, H1, Muted, Segmented } from '../lib/ui';

export default function Login() {
  const c = useColors();
  const { continueAsGuest } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    if (!supabase) return;
    if (!email.includes('@') || pw.length < 6) {
      setMsg({ ok: false, text: 'Enter a valid email and a password of at least 6 characters.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
        : await supabase.auth.signUp({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    if (mode === 'up' && !data.session) return setMsg({ ok: true, text: 'Account created. Check your email to confirm, then sign in.' });
    router.replace('/');
  }

  const input = { borderWidth: 1.5, borderColor: c.line, borderRadius: 10, padding: 12, fontSize: 16, color: c.ink, backgroundColor: c.card };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 46, fontWeight: '800', color: c.rose, letterSpacing: -1 }}>RankPrep</Text>
            <H1 style={{ fontSize: 22 }}>Your JEE & NEET study partner</H1>
            <Muted>Practice tests with NTA marking, syllabus tracker, focus timer and PIP, your AI doubt solver.</Muted>
          </View>
          <Card style={{ gap: 12 }}>
            <Segmented value={mode} onChange={setMode} options={[{ value: 'in', label: 'Sign in' }, { value: 'up', label: 'Create account' }]} />
            <TextInput style={input} placeholder="Email" placeholderTextColor={c.mut} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} />
            <TextInput style={input} placeholder="Password" placeholderTextColor={c.mut} secureTextEntry value={pw} onChangeText={setPw} onSubmitEditing={submit} />
            {msg && <Text style={{ color: msg.ok ? c.ok : c.bad }}>{msg.text}</Text>}
            <Btn title={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
          </Card>
          {Platform.OS !== 'web' && (
          <Btn
            ghost
            title="Continue without account"
            onPress={() => {
              continueAsGuest();
              router.replace('/');
            }}
          />
          )}
          <Muted style={{ textAlign: 'center' }}>{Platform.OS === 'web' ? 'Create a free account to start studying. Your progress is saved to your account.' : 'Without an account, progress stays on this phone and PIP is not available.'}</Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
