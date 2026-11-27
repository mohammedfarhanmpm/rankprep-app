"""Fill in missing solutions with Gemini, given the question, options, figures and the known correct answer.

The answer comes from the answer key, so the model only explains it. Generated solutions are marked
"solution_ai": true so the app can label them. Results are cached (resumable).
Usage: python3 gen_solutions.py <json dirs...>
"""
import base64, hashlib, json, os, re, sys, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

MODEL = os.environ.get('GEMINI_MODEL', 'gemini-3.8-flash')
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'
CACHE_F = 'solutions_cache.json'
cache = json.load(open(CACHE_F)) if os.path.exists(CACHE_F) else {}
lock = threading.Lock()
IMG = re.compile(r'\[\[img:([0-9a-f]+)\.\w+\]\]')
SUBJ = {'Physics': 'Physics', 'Chemistry': 'Chemistry', 'Maths': 'Mathematics', 'NEETPhysics': 'Physics', 'NEETChemistry': 'Chemistry',
        'BTSPhysics': 'Physics', 'BTSChemistry': 'Chemistry', 'BTSBiology': 'Biology'}


def key(q):
    return hashlib.sha1(json.dumps([q['text'], q['options'], q['answer']], ensure_ascii=False).encode()).hexdigest()


def find_img(name, dirs):
    for d in dirs:
        for ext in ('.png', '.jpg', '.jpeg', '.gif'):
            p = os.path.join(d, 'img', name + ext)
            if os.path.exists(p):
                return p, 'image/png' if ext == '.png' else 'image/jpeg' if ext in ('.jpg', '.jpeg') else 'image/gif'
    return None, None


def ask(q, subject, dirs):
    exam = 'JEE' if subject == 'Mathematics' else 'NEET/JEE'
    opts = '\n'.join(f"({'ABCD'[i]}) {IMG.sub('[figure]', o)}" for i, o in enumerate(q['options']))
    ans = f"({q['answer']}) {IMG.sub('[figure]', q['options']['ABCD'.index(q['answer'])])}" if q['type'] == 'mcq' else q['answer']
    prompt = (f"You are an expert {exam} {subject} teacher. Write a clear solution for the question below in plain text "
              "(no markdown, no LaTeX; use symbols like ², √, →, Δ). For calculations show the key steps with formulas and units; "
              "for theory explain the concept in 2-4 sentences and briefly say why the other options are wrong. "
              f"The correct answer is {ans}; your solution must reach exactly this answer. Keep it under 120 words.\n\n"
              f"Question: {IMG.sub('[figure]', q['text'])}\n{opts}")
    parts = [{'text': prompt}]
    for name in IMG.findall(q['text'] + ' '.join(q['options'])):
        p, mime = find_img(name, dirs)
        if p and os.path.getsize(p) < 3_000_000:
            parts.append({'inline_data': {'mime_type': mime, 'data': base64.b64encode(open(p, 'rb').read()).decode()}})
    body = json.dumps({'contents': [{'parts': parts}], 'generationConfig': {'maxOutputTokens': 1200, 'temperature': 0.2}}).encode()
    for attempt in range(6):
        try:
            req = urllib.request.Request(URL, data=body, headers={'content-type': 'application/json', 'x-goog-api-key': 'dummy'})
            r = json.load(urllib.request.urlopen(req, timeout=120))
            text = ''.join(p.get('text', '') for p in r['candidates'][0]['content']['parts']).strip()
            text = re.sub(r'\*\*|__|^#+\s*', '', text, flags=re.M)
            return text
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503):
                time.sleep(5 * 2 ** attempt)
                continue
            return None
        except Exception:
            time.sleep(5 * 2 ** attempt)
    return None


def main(dirs):
    todo = []
    files = {}
    for d in dirs:
        for f in sorted(os.listdir(d)):
            if not f.endswith('.json'):
                continue
            path = os.path.join(d, f)
            data = json.load(open(path))
            files[path] = data
            subject = SUBJ.get(f.split('_')[0], 'Science')
            for q in data['questions']:
                if len(q['solution'].strip()) < 15 and q['answer']:
                    todo.append((path, q, subject))
    print('missing solutions:', len(todo), 'cached:', sum(key(q) in cache for _, q, _ in todo), flush=True)
    done = [0]

    def work(item):
        path, q, subject = item
        k = key(q)
        if k not in cache:
            s = ask(q, subject, dirs)
            if s:
                with lock:
                    cache[k] = s
                    done[0] += 1
                    if done[0] % 50 == 0:
                        json.dump(cache, open(CACHE_F, 'w'), ensure_ascii=False)
                        print('generated', done[0], flush=True)

    with ThreadPoolExecutor(int(os.environ.get('WORKERS', '8'))) as ex:
        list(ex.map(work, todo))
    json.dump(cache, open(CACHE_F, 'w'), ensure_ascii=False)
    filled = 0
    for path, data in files.items():
        changed = False
        for q in data['questions']:
            if len(q['solution'].strip()) < 15 and key(q) in cache:
                q['solution'] = cache[key(q)]
                q['solution_ai'] = True
                changed = True
                filled += 1
        if changed:
            json.dump(data, open(path, 'w'), ensure_ascii=False)
    print('filled', filled, 'of', len(todo), flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
