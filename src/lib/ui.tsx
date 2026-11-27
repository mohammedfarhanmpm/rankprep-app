import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { useColors } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }, style]}>{children}</View>;
}

export function Btn({ title, onPress, ghost, disabled, style }: { title: string; onPress: () => void; ghost?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        { borderColor: c.rose, backgroundColor: ghost ? 'transparent' : c.rose, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[s.btnText, { color: ghost ? c.rose : '#fff' }]}>{title}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View style={[s.seg, { borderColor: c.rose }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segBtn, on && { backgroundColor: c.rose }]} accessibilityState={{ selected: on }}>
            <Text style={{ color: on ? '#fff' : c.rose, fontWeight: '600', fontSize: 15 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Bar({ pct }: { pct: number }) {
  const c = useColors();
  return (
    <View style={[s.bar, { backgroundColor: c.roseT }]}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: c.rose, borderRadius: 6 }} />
    </View>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useColors();
  return <Text style={[{ fontSize: 30, fontWeight: '800', color: c.ink, letterSpacing: -0.5 }, style]}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ fontSize: 20, fontWeight: '800', color: c.ink, marginBottom: 10 }}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useColors();
  return <Text style={[{ color: c.mut, fontSize: 14 }, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  btn: { borderWidth: 2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '600' },
  seg: { flexDirection: 'row', borderWidth: 2, borderRadius: 999, overflow: 'hidden', alignSelf: 'flex-start' },
  segBtn: { paddingVertical: 10, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center' },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
});
