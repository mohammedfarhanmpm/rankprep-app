"""Parse the NEET question-bank .docx files (format: difficulty sections, inline options).

  PHYSICS – Atoms
  Easy (92 questions)
  Q1. question text...
  A. 1 B .4 C .3 D .2          (options may span lines, use "A." / "A ." / "(A)")
  Answer: (C)
  Solution: ...
Output JSON matches parse.py so gen_app.py can consume it.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse import Doc, clean  # noqa: E402

SECTION = re.compile(r'^(Easy|Medium|Moderate|Hard|Difficult)\b.*?\(\s*\d+\s*questions?\s*\)', re.I)
QSTART = re.compile(r'^Q\s*(\d+)\s*[.:)]\s*(.*)$', re.S)
ANSWER = re.compile(r'^(?:✅\s*)?(?:Correct\s+)?Answer\s*[:\-]?\s*(.*)$', re.I)
SOL = re.compile(r'^(?:Solution|Explanation|Sol)\s*[:.\-]\s*(.*)$', re.I | re.S)
# option marker: "(A)", "A.", "A .", "A)" at start or after whitespace
MARK = r'(?:(?<=\s)|^)(?:\(\s*{L}\s*\)|{L}\s*[.)])\s*'
OPT_LINE = re.compile(r'^\s*(?:\(\s*A\s*\)|A\s*[.)])')
DIFF = {'easy': 'Easy', 'medium': 'Moderate', 'moderate': 'Moderate', 'hard': 'Hard', 'difficult': 'Hard'}


W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
import xml.etree.ElementTree as ET


def blocks(d):
    """Like Doc.blocks, but marks Word auto-numbered list paragraphs as kind 'list' and tables as 'table'."""
    from parse import NS
    root = ET.fromstring(d.z.read('word/document.xml'))
    for el in root.find('w:body', NS):
        if el.tag == W + 'p':
            st = el.find('w:pPr/w:pStyle', NS)
            num = el.find('w:pPr/w:numPr', NS)
            style = st.get(W + 'val') if st is not None else ''
            yield ('list' if num is not None else 'p'), style, d.para_text(el)
        elif el.tag == W + 'tbl':
            rows = []
            for tr in el.findall('.//w:tr', NS):
                rows.append([' '.join(d.para_text(p) for p in tc.findall('.//w:p', NS)).strip() for tc in tr.findall('w:tc', NS)])
            yield 'table', 'Table', rows


def find_markers(s, pats):
    """Find option markers in order (one regex per option). Returns 4 option strings and leading text, or None."""
    pos, cur = [], 0
    for pat in pats:
        m = re.compile(pat).search(s, cur)
        if not m:
            return None
        pos.append((m.start(), m.end()))
        cur = m.end()
    opts = [s[end:(pos[i + 1][0] if i < 3 else len(s))].strip() for i, (_, end) in enumerate(pos)]
    return (s[:pos[0][0]].strip(), opts) if all(opts) else None


LETTER_STRICT = [r'(?:(?<=\s)|^)(?:\(\s*%s\s*\)|%s\s*[.)])\s*' % (L, L) for L in 'ABCD']
LETTER_LOOSE = [r'(?:(?<=\s)|^)%s\s+(?=\S)' % L for L in 'ABCD']
LETTER_LOWER = [r'(?:(?<=\s)|^)(?:\(\s*%s\s*\)|%s\s*[.)])\s*' % (L, L) for L in 'abcd']
LETTER_MIXED = [r'(?:(?<=\s)|^)(?:\(\s*%s\s*\)|%s\s*[.)]|%s\s+(?=\S))\s*' % (L, L, L) for L in 'ABCD']
NUMBERED = [r'(?:(?<=\s)|^)(?:\(\s*%d\s*\)|%d\s*[.)])\s*' % (n, n) for n in range(1, 5)]


def split_body(lines):
    """lines: [(kind, text|rows)] between question start and answer. Returns (question_text, options) or (text, None)."""
    lst = [i for i, (k, _) in enumerate(lines) if k == 'list']
    # Options written as a Word numbered list: the last 4 list items.
    if len(lst) >= 4 and lst[-4:] == list(range(lst[-4], lst[-4] + 4)):
        opt_idx = lst[-4:]
        text, letter = [], 0
        for i, (k, t) in enumerate(lines):
            if i in opt_idx or k == 'table':
                if k == 'table':
                    text.append(table_text(t))
                continue
            if k == 'list':
                text.append(f'({"ABCDEFGH"[letter]}) {t}')
                letter += 1
            else:
                text.append(t)
        return '\n'.join(text), [lines[i][1] for i in opt_idx]
    # Match-the-following answer table with rows "1)".."4)".
    for k, t in lines:
        if k == 'table' and len(t) >= 5 and all(re.match(r'^\(?%d\)?' % n, (t[n][0] if t[n] else '')) for n in range(1, 5)):
            head = t[0]
            opts = [', '.join(f'{h}–{c}' for h, c in zip(head[1:], row[1:])) for row in t[1:5]]
            text = '\n'.join(x if k2 != 'table' else '' for k2, x in lines if k2 != 'table')
            return text, opts
    def item(k, t):
        if k == 'table':
            return table_text(t)
        # a numbered list item "increased 2) decreased 3) ..." lost its auto-number "1)"
        if k == 'list' and re.search(r'\s\(?2\)\s', ' ' + t) and not re.match(r'^\(?1\)', t):
            return '(1) ' + t
        return t
    flat = '\n'.join(item(k, t) for k, t in lines)
    for pats in (LETTER_STRICT, LETTER_LOWER, NUMBERED, LETTER_MIXED, LETTER_LOOSE):
        r = find_markers(flat, pats)
        if r:
            return r
    return flat, None


def table_text(rows):
    return '\n'.join(' | '.join(r) for r in rows)


def strip_stars(s):
    return re.sub(r'\*\*+', '', s).strip()


def parse(path, img_dir, subject):
    d = Doc(path, img_dir, subject)
    qs, bad = [], []
    diff, cur, mode = 'Moderate', None, None

    def flush():
        nonlocal cur
        if not cur:
            return
        text, opts = split_body(cur['body'])
        ans = cur['answer_raw'].strip()
        nm = re.match(r'^\(\s*(-?\d+(?:\.\d+)?)\s*\)$', ans)
        if nm and (not opts or float(nm.group(1)) > 4 or float(nm.group(1)) < 1 or '.' in nm.group(1)):
            ans = nm.group(1)  # "(72.56)" or "(-57)" is a numerical answer; "(3)" with options is an option
        if not opts and '[[img:' in text and re.match(r'^\(?\s*[A-Da-d1-4]\s*\)?$', ans):
            # all four options are drawn inside the figure
            opts = [f'Option ({k}) in the figure' for k in '1234']
        base = {'test': cur['test'], 'n': cur['n'], 'difficulty': cur['difficulty'], 'topic': '',
                'text': clean(strip_stars(text)), 'solution': clean('\n'.join(cur['solution']))}
        m = re.match(r'^\(?\s*([A-Da-d1-4])\s*\)?(?:\s|$|[.,])', ans + ' ')
        if opts and m and base['text']:
            a = m.group(1).upper()
            qs.append({**base, 'type': 'mcq', 'options': [clean(strip_stars(o)) for o in opts], 'answer': a if a in 'ABCD' else 'ABCD'[int(a) - 1]})
        elif not opts and re.match(r'^-?\d+(\.\d+)?', ans) and base['text']:
            qs.append({**base, 'type': 'numerical', 'options': [], 'answer': ans})
        else:
            bad.append((cur['n'], cur['difficulty'], ans[:20]))
        cur = None

    for kind, style, text in blocks(d):
        if kind != 'table' and not text:
            continue
        if kind != 'table':
            sm = SECTION.match(text)
            if sm:
                flush()
                diff = DIFF[sm.group(1).lower()]
                mode = None
                continue
            qm = QSTART.match(text)
            if qm and kind == 'p':
                flush()
                cur = {'test': f'{diff} set', 'n': int(qm.group(1)), 'difficulty': diff, 'body': [('p', qm.group(2))], 'answer_raw': '', 'solution': []}
                mode = 'body'
                continue
        if cur is None:
            continue
        if kind != 'table':
            am = ANSWER.match(text)
            if am and mode == 'body':
                cur['answer_raw'] = am.group(1)
                mode = 'ans'
                continue
            so = SOL.match(text)
            if so and mode in ('ans', 'body'):
                mode = 'sol'
                if so.group(1).strip():
                    cur['solution'].append(so.group(1).strip())
                continue
        if mode == 'body':
            cur['body'].append((kind, text))
        elif mode in ('ans', 'sol'):
            cur['solution'].append(table_text(text) if kind == 'table' else text)
    flush()
    return qs, d.images, bad


if __name__ == '__main__':
    src, out_dir, subject, prefix = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    img_dir = os.path.join(out_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    tq = tb = 0
    for f in sorted(os.listdir(src)):
        if not f.endswith('.docx'):
            continue
        chapter = re.sub(r'^\d+_', '', f[:-5]).replace('_', ' ')
        qs, imgs, bad = parse(os.path.join(src, f), img_dir, subject)
        name = f'{prefix}_{chapter.replace(" ", "_")}.json'
        json.dump({'subject': subject, 'chapter': chapter, 'questions': qs}, open(os.path.join(out_dir, name), 'w'), ensure_ascii=False)
        tq += len(qs)
        tb += len(bad)
        print(f'{f}: {len(qs)} ok, {len(bad)} skipped, {len(imgs)} images')
    print('TOTAL', tq, 'ok', tb, 'skipped')
