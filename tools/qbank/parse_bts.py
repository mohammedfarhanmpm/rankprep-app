"""Parse Brilliant Test Series (BTS) .docx files.

Format: "N. question" | "(1)".."(4)" options | "[SOURCE TAG]" | ... | "Answer Key — <chapter>" table
(rows alternate question numbers / answers; "—" = answer not released, question skipped).
Usage: python3 parse_bts.py <folder with .docx> <out_dir> <prefix>
Output JSON matches parse.py.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse import Doc, clean  # noqa: E402
from parse_neet import blocks, table_text  # noqa: E402

QSTART = re.compile(r'^(\d+)\s*[.)]\s+(.*)$', re.S)
OPT = re.compile(r'^\(\s*([1-4])\s*\)\s*(.*)$', re.S)
TAG = re.compile(r'^\[(?!\[img:)(.*)\]$', re.S)  # source tag like [NEET MODEL 01-08-2026 [BTS]], not an image token


def parse(path, img_dir):
    d = Doc(path, img_dir, 'X')
    qs, cur, key = {}, None, {}
    in_key = False
    for kind, style, text in blocks(d):
        if kind == 'table':
            if in_key:
                for i in range(0, len(text) - 1, 2):
                    for n, a in zip(text[i], text[i + 1]):
                        if n.strip().isdigit():
                            key[int(n)] = a.strip()
            elif cur:
                cur['text'].append(table_text(text))
            continue
        if not text:
            continue
        if style.startswith('Heading') and text.lower().startswith('answer key'):
            in_key = True
            cur = None
            continue
        if in_key or style in ('Title', 'Heading1') or text.startswith('Brilliant Test Series'):
            continue
        tm = TAG.match(text)
        if tm and cur:
            cur['tag'] = re.sub(r'\s*\[\s*', ' (', tm.group(1).strip('[] ')).rstrip(']') + (')' if '[' in tm.group(1) else '')
            continue
        om = OPT.match(text)
        if om and cur and len(cur['options']) == int(om.group(1)) - 1:
            cur['options'].append(om.group(2))
            continue
        qm = QSTART.match(text)
        if qm and (cur is None or len(cur['options']) == 4 or not cur['options']) and int(qm.group(1)) not in qs:
            cur = {'n': int(qm.group(1)), 'text': [qm.group(2)], 'options': [], 'tag': ''}
            qs[cur['n']] = cur
            continue
        if cur:
            if cur['options'] and len(cur['options']) < 4:
                cur['options'][-1] += '\n' + text
            elif not cur['options']:
                cur['text'].append(text)
    out, skipped = [], 0
    for n, q in sorted(qs.items()):
        a = key.get(n, '')
        if len(q['options']) != 4 or a not in ('1', '2', '3', '4'):
            skipped += 1
            continue
        out.append({'test': q['tag'] or 'BTS', 'n': n, 'type': 'mcq', 'difficulty': 'Moderate', 'topic': q['tag'],
                    'text': clean('\n'.join(q['text'])), 'options': [clean(o) for o in q['options']],
                    'answer': 'ABCD'[int(a) - 1], 'solution': ''})
    return out, d.images, skipped


if __name__ == '__main__':
    src, out_dir, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    img_dir = os.path.join(out_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    tq = ts = 0
    for f in sorted(os.listdir(src)):
        if not f.endswith('.docx'):
            continue
        chapter = re.sub(r'^\d+\s+', '', f[:-5])
        qs, imgs, skipped = parse(os.path.join(src, f), img_dir)
        json.dump({'subject': prefix, 'chapter': chapter, 'questions': qs},
                  open(os.path.join(out_dir, f'{prefix}_{chapter.replace(" ", "_").replace(",", "")}.json'), 'w'), ensure_ascii=False)
        tq += len(qs)
        ts += skipped
        print(f'{f}: {len(qs)} ok, {skipped} skipped (no answer/options), {len(imgs)} images')
    print('TOTAL', tq, 'ok', ts, 'skipped')
