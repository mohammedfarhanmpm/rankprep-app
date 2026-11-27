import type { Mood } from './app-state';

/** PIP's own motivation lines (original), picked by today's mood. */
const LINES: Record<Mood | 'any', string[]> = {
  great: [
    'You have energy today. Pick the hardest chapter first and own it.',
    'Great days are for big wins. Try one Hard-level test today.',
    'Ride this wave: one deep 50-minute session now is worth three later.',
    "Feeling good? Teach a concept to a friend. You'll remember it forever.",
  ],
  good: [
    'Steady beats fast. Finish today’s topics one by one.',
    'A good day is built from small ticks. Go get the first one.',
    'You are closer than you were yesterday. Keep the streak alive.',
    'Do the plan, then reward yourself. You earned it.',
  ],
  okay: [
    'Okay days still count. Just start with 10 minutes.',
    'You don’t need motivation to begin. Begin, and it will follow.',
    'One topic, one tick. That’s enough to move forward today.',
    'Small progress is still progress. Be proud of it.',
  ],
  tired: [
    'Rest is part of the plan. A short session and an early night is a smart choice.',
    'Tired minds learn better with breaks. 25 minutes on, 5 minutes off.',
    'Revise something easy today, like formulas or flashcards. Tomorrow, the tough stuff.',
    'Drink water, stretch, breathe. Then just one small task.',
  ],
  stressed: [
    'Breathe in for 4, hold for 4, out for 6. You are doing better than you think.',
    'Exams test chapters, not your worth. You are more than one score.',
    'Write down what’s worrying you, then pick just one thing you can do now.',
    'You don’t have to finish everything today. Just the next small step.',
    'It’s okay to talk to someone you trust. Asking for help is strong, not weak.',
  ],
  sick: [
    'Your health comes first. Rest today. The syllabus will wait for you.',
    'Get well soon! If you feel up to it, only light revision. No pressure.',
    'Sleep, fluids and rest are your best study plan today. 🤍',
  ],
  any: [
    'Consistency is the real topper’s secret.',
    'Every mistake in practice is one less mistake in the exam.',
    'Compare yourself only with who you were yesterday.',
    'Your future self is cheering for what you do today.',
    'Doubts are normal. Ask PIP, ask a teacher, keep going.',
    'A tick in the planner is a promise kept to yourself.',
  ],
};

function hash(s: string): number {
  let h = 7;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Today's line for a mood (stable through the day). */
export function motivationFor(mood: Mood | null, day: string, offset = 0): string {
  const pool = [...(mood ? LINES[mood] : []), ...LINES.any];
  return pool[(hash(day) + offset) % pool.length];
}

/** What PIP suggests doing, for each mood. */
export const MOOD_PLAN: Record<Mood, { text: string; action: string; route: string }> = {
  great: { text: 'Big energy! Try a 50-minute deep focus session.', action: 'Start focus mode', route: '/focus' },
  good: { text: 'Nice! Start with today’s first planned topic.', action: 'Open planner', route: '/planner' },
  okay: { text: 'Start small: a 10-minute quick test.', action: 'Quick test', route: '/practice?mode=quick' },
  tired: { text: 'Go easy: swipe some flashcards, then rest.', action: 'Flashcards', route: '/flashcards' },
  stressed: { text: 'First, 2 minutes of breathing with PIP.', action: 'Breathe', route: '/relax' },
  sick: { text: 'Rest today. Today’s goal is paused. Get well soon!', action: 'Write in journal', route: '/planner' },
};

export const MOOD_EMOJI: Record<Mood, string> = { great: '🤩', good: '🙂', okay: '😐', tired: '😴', stressed: '😣', sick: '🤒' };
