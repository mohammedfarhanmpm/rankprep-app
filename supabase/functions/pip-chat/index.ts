// PIP: AI doubt solver for school (Class 8–12) and JEE/NEET students.
// The AI provider is chosen by secrets, so the model can be decided later:
//   AI_PROVIDER = "anthropic" (needs ANTHROPIC_API_KEY) or "gemini" (needs GEMINI_API_KEY)
//   AI_MODEL    = optional model override
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM = `You are PIP, an expert, friendly tutor for Indian students: school (Class 8–12, Kerala SCERT, CBSE, ICSE)
and JEE Main/Advanced and NEET UG aspirants. Cover Physics, Chemistry, Mathematics and Biology at the student's level
(NCERT/SCERT for school, NCERT + competitive-exam level for JEE/NEET).
For every doubt: 1) name the concept/chapter, 2) solve step by step with formulas and units,
3) give the final answer clearly, 4) add one exam shortcut or common trap.
Use plain text with simple symbols (², √, →, Δ). No LaTeX, no markdown tables. Keep it concise.
If the student writes in Malayalam or Manglish, reply in simple Manglish, keeping technical terms in English.
Politely decline topics unrelated to studies.`;

type Msg = { role: 'user' | 'assistant'; content: string };
type Img = { data: string; mediaType: string };
const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function askAnthropic(system: string, messages: Msg[], image?: Img): Promise<string> {
  const msgs = messages.map((m, i) =>
    image && i === messages.length - 1
      ? { role: m.role, content: [{ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } }, { type: 'text', text: m.content }] }
      : m,
  );
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: Deno.env.get('AI_MODEL') || 'claude-sonnet-5-5', max_tokens: 1500, system, messages: msgs }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message ?? `Anthropic ${r.status}`);
  return d.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
}

async function askGemini(system: string, messages: Msg[], image?: Img): Promise<string> {
  const model = Deno.env.get('AI_MODEL') || 'gemini-3.8-flash';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m, i) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: image && i === messages.length - 1 ? [{ inline_data: { mime_type: image.mediaType, data: image.data } }, { text: m.content }] : [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 1500 },
    }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message ?? `Gemini ${r.status}`);
  return (d.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'Please sign in to use PIP.' }, 401);

  let body: { exam?: string; messages?: Msg[]; image?: Img };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'Ask a question first.' }, 400);

  const img = body.image;
  const image = img && typeof img.data === 'string' && IMG_TYPES.includes(img.mediaType) && img.data.length < 7_000_000 ? img : undefined;

  const provider = (Deno.env.get('AI_PROVIDER') || '').toLowerCase();
  const exam = typeof body.exam === 'string' && body.exam.trim() ? body.exam.trim().slice(0, 60) : 'JEE/NEET';
  const system = `${SYSTEM}\nThe student is in / preparing for: ${exam}. Pitch explanations at that level.`;

  let reply: string;
  try {
    if (provider === 'anthropic' && Deno.env.get('ANTHROPIC_API_KEY')) reply = await askAnthropic(system, messages, image);
    else if (provider === 'gemini' && Deno.env.get('GEMINI_API_KEY')) reply = await askGemini(system, messages, image);
    else return json({ reply: "PIP's AI model is not connected yet. The app owner needs to add an AI API key. Please try again later." });
  } catch (e) {
    console.error('pip-chat provider error', e);
    return json({ reply: 'PIP is busy right now. Please try again in a minute.' });
  }

  await supabase.from('rp_pip_messages').insert([
    { user_id: auth.user.id, role: 'user', content: (image ? '[photo] ' : '') + messages[messages.length - 1].content },
    { user_id: auth.user.id, role: 'assistant', content: reply },
  ]);
  return json({ reply });
});
