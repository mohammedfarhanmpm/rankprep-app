import { Image, Text, TextStyle, useWindowDimensions, View } from 'react-native';
import { IMAGES } from '../bank/images';

const TOKEN = /\[\[img:([0-9a-f]+)\]\]/g;

/**
 * Renders question-bank text: plain text with [[img:<hash>]] tokens turned into bundled images.
 * Images scale down to fit `maxWidth` (defaults to the screen minus padding) and never upscale beyond 1.5×.
 */
export function RichText({ text, style, maxWidth }: { text: string; style?: TextStyle; maxWidth?: number }) {
  const { width } = useWindowDimensions();
  const limit = maxWidth ?? width - 72;
  if (!text.includes('[[img:')) return <Text style={style}>{text}</Text>;

  const parts: { kind: 'text' | 'img'; value: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) parts.push({ kind: 'text', value: text.slice(last, m.index) });
    parts.push({ kind: 'img', value: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });

  return (
    <View style={{ gap: 6 }}>
      {parts.map((p, i) => {
        if (p.kind === 'text') {
          const t = p.value.trim();
          return t ? <Text key={i} style={style}>{t}</Text> : null;
        }
        const img = IMAGES[p.value];
        if (!img) return null;
        const w = Math.min(limit, img.w * 1.5);
        const h = (img.h / img.w) * w;
        return (
          <View key={i} style={{ backgroundColor: '#fff', borderRadius: 6, padding: 4, alignSelf: 'flex-start' }}>
            <Image source={img.src} style={{ width: w, height: h }} resizeMode="contain" accessibilityLabel="Question figure" />
          </View>
        );
      })}
    </View>
  );
}
