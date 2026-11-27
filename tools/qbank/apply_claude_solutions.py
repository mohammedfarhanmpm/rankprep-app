"""Merge solutions written by Claude agents (claude_out/batch_NN.json) into the bank JSON files.

Each output file: {"solutions": {key: text}, "doubtful": [key, ...]}. Keys match gen_solutions.key().
Filled questions get "solution_ai": true (shown in the app as an AI explanation based on the answer key).
Doubtful keys (answer key may be wrong) are collected in doubtful.json for a human to check.
"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_solutions import key  # noqa: E402

sols, doubtful = {}, set()
for f in sorted(glob.glob('claude_out/batch_*.json')):
    try:
        d = json.load(open(f))
    except json.JSONDecodeError:
        print('skip unreadable', f)
        continue
    sols.update({k: v.strip() for k, v in d.get('solutions', {}).items() if isinstance(v, str) and len(v.strip()) >= 15})
    doubtful.update(d.get('doubtful', []))

filled, flagged = 0, []
for d in ('bout', 'wout', 'out', 'nout'):
    for f in glob.glob(d + '/*.json'):
        data = json.load(open(f))
        changed = False
        for q in data['questions']:
            k = key(q)
            if len(q['solution'].strip()) < 15 and k in sols:
                q['solution'] = sols[k]
                q['solution_ai'] = True
                changed = True
                filled += 1
            if k in doubtful:
                flagged.append({'file': f, 'n': q['n'], 'question': q['text'][:200], 'options': q['options'], 'answer': q['answer']})
        if changed:
            json.dump(data, open(f, 'w'), ensure_ascii=False)
json.dump(flagged, open('doubtful.json', 'w'), ensure_ascii=False, indent=1)
print(f'solutions available {len(sols)}, filled now {filled}, doubtful {len(flagged)}')
