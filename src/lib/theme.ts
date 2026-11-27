import { useColorScheme } from 'react-native';

// Soft pastel palette ("cute" look): blush pink accent, with lavender, mint, peach, sky and lemon fields.
// `rose` stays dark enough for white text on buttons; the *T colours are pastel backgrounds.
const light = {
  bg: '#fff8fb',
  card: '#ffffff',
  ink: '#3b3346',
  mut: '#7d7488',
  rose: '#c9577d',
  roseT: '#fde8f0',
  line: '#f2d6e1',
  ok: '#3f9a72',
  okT: '#e2f6ec',
  bad: '#d0606e',
  badT: '#fde9eb',
  lav: '#ece6ff',
  lavInk: '#6a55b8',
  mint: '#dff5ea',
  mintInk: '#2f8a62',
  peach: '#ffe9dc',
  peachInk: '#c06a3b',
  sky: '#e2efff',
  skyInk: '#3b6fb8',
  lemon: '#fff6d6',
  lemonInk: '#a37f12',
};

const dark: typeof light = {
  bg: '#1b1720',
  card: '#25202b',
  ink: '#f3eef7',
  mut: '#b4aabf',
  rose: '#f08cae',
  roseT: '#3d2431',
  line: '#4a3843',
  ok: '#7fd3a9',
  okT: '#1f3a2d',
  bad: '#f19aa4',
  badT: '#40242a',
  lav: '#2f2944',
  lavInk: '#c3b5ff',
  mint: '#1f3a2f',
  mintInk: '#93e0bb',
  peach: '#40302a',
  peachInk: '#ffb98f',
  sky: '#24324a',
  skyInk: '#9fc4ff',
  lemon: '#3d3620',
  lemonInk: '#f0d77a',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Pastel background + readable ink for a subject or category. */
export function pastel(c: Colors, key: string): { bg: string; ink: string } {
  const k = key.replace(/^NEET /, '');
  if (k === 'Physics') return { bg: c.sky, ink: c.skyInk };
  if (k === 'Chemistry') return { bg: c.peach, ink: c.peachInk };
  if (k === 'Maths') return { bg: c.lav, ink: c.lavInk };
  if (k === 'Biology') return { bg: c.mint, ink: c.mintInk };
  if (k === 'Health') return { bg: c.mint, ink: c.mintInk };
  if (k === 'Personal') return { bg: c.lemon, ink: c.lemonInk };
  if (k === 'Study') return { bg: c.lav, ink: c.lavInk };
  return { bg: c.roseT, ink: c.rose };
}
