"""Parse the OCR'd two-column Biology workbook (ocr_pages.py output) into question-bank JSON.

Per chapter: main questions 1..N, then "SAMPLE QUESTIONS" 1..M, then an ANSWER KEY page (main key, then sample key).
Answer keys are read from the PDF text layer (digits survive there), questions from OCR lines.
Usage: python3 parse_workbook.py <pdf> <ocr_dir> <out_dir>
"""
import json, os, re, subprocess, sys

PDF, OCR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)

# Printed start pages from the contents page; PDF page = printed page - 2.
CHAPTERS = [
    ('Biological Classification', 5), ('Plant Kingdom', 23), ('Morphology of Flowering Plants', 41), ('Anatomy of Flowering Plants', 59),
    ('Cell The Unit of Life', 80), ('Cell Cycle and Cell Division', 98), ('Photosynthesis in Higher Plants', 117), ('Respiration in Plants', 138),
    ('Plant Growth and Development', 155), ('Sexual Reproduction in Flowering Plants', 170), ('Biotechnology Principles and Processes', 187),
    ('Biotechnology and its Applications', 208), ('Organisms and Populations', 229), ('Ecosystem', 248), ('The Living World', 265),
    ('Animal Kingdom Non Chordata', 276), ('Animal Kingdom Chordata', 297), ('Structural Organisation in Animals', 317), ('Biomolecules', 335),
    ('Breathing and Exchange of Gases', 357), ('Body Fluids and Circulation', 377), ('Excretory Products and their Elimination', 393),
    ('Locomotion and Movement', 417), ('Neural Control and Coordination', 441), ('Chemical Coordination and Integration', 458),
    ('Human Reproduction', 477), ('Reproductive Health', 493), ('Principles of Inheritance and Variation', 509),
    ('Molecular Basis of Inheritance', 528), ('Evolution', 550), ('Human Health and Disease', 566), ('Microbes in Human Welfare', 582),
    ('Biodiversity and Conservation', 595)]
LAST_PAGE = 606

NOISE = re.compile(r'(Work\s*Book|^\d+\s*Biology$|Brilliant|STUDY\s*CENTRE|NEET\s*20\d\d|^B$|^Chapter$|^BOTANY$|^ZOOLOGY$|WORK\s*BOOK)', re.I)
QNUM = re.compile(r'^(\d{1,3})\s*[.,]\s*(.*)$')
OPTS = re.compile(r'(?:(?<=\s)|^)\(?([1-4])\)\s*')


def page_lines(p):
    f = os.path.join(OCR, 'txt', f'{p:04d}.json')
    if not os.path.exists(f):
        return []
    d = json.load(open(f))
    out = []
    for k in (0, 1):
        items = [(cy, t) for cy, x, t in d['cols'][k]]
        items += [(fg['y'], f'[[img:{fg["name"]}.png]]') for fg in d['figs'] if fg['col'] == k]
        out += [t for _, t in sorted(items)]
    return out


def key_text(p0, p1):
    txt = subprocess.run(['pdftotext', '-f', str(p0), '-l', str(p1), '-layout', PDF, '-'], capture_output=True, text=True).stdout
    i = txt.find('ANSWER KEY')
    if i < 0:
        return {}, {}
    body = txt[i:]
    j = body.find('SAMPLE QUESTIONS')
    main, sample = (body[:j], body[j:]) if j >= 0 else (body, '')
    grab = lambda s: {int(n): int(a) for n, a in re.findall(r'(\d{1,3})\.\s+([1-4])\b', s)}
    return grab(main), grab(sample)


def is_heading(t):
    if ')' in t or t.startswith('[[img:'):
        return False
    letters = re.sub(r'[^A-Za-z]', '', t)
    return len(letters) >= 6 and sum(c.isupper() for c in letters) / len(letters) > 0.85 and not QNUM.match(t)


def parse_chapter(name, p0, p1):
    lines = []
    for p in range(p0, p1 + 1):
        for t in page_lines(p):
            if 'ANSWER KEY' in t.upper():
                lines.append('@@KEY')
                break
            lines.append(t)
    sections = {'main': {}, 'sample': {}}
    sec, cur, expect, topic = 'main', None, 1, ''
    for t in lines:
        t = t.strip()
        if t == '@@KEY':
            break
        if not t.startswith('[[img:'):
            t = re.sub(r'^[|!\[\]]+\s*', '', t)
        if not t or NOISE.search(t) and len(t) < 40:
            continue
        if 'SAMPLE QUESTIONS' in t.upper():
            sec, cur, expect = 'sample', None, 1
            continue
        if is_heading(t) and not (cur and not cur['options']):
            topic = t.title()
            continue
        m = QNUM.match(t)
        if m and expect <= int(m.group(1)) <= expect + 4 and not OPTS.match(t):
            n = int(m.group(1))
            cur = {'n': n, 'text': [m.group(2)] if m.group(2) else [], 'options': [], 'topic': topic}
            sections[sec][n] = cur
            expect = n + 1
            continue
        if cur is None:
            continue
        if len(cur['options']) == 4 and OPTS.match(t):
            # options of a question whose number OCR missed: drop them, wait for the next number
            cur = None
            continue
        if OPTS.match(t) or (cur['options'] and len(cur['options']) < 4 and OPTS.search(t)):
            parts = OPTS.split(t)
            # parts: [before, num, text, num, text, ...]
            if parts[0].strip() and cur['options']:
                cur['options'][-1] += ' ' + parts[0].strip()
            for i in range(1, len(parts) - 1, 2):
                if int(parts[i]) == len(cur['options']) + 1:
                    cur['options'].append(parts[i + 1].strip())
                elif cur['options']:
                    cur['options'][-1] += f' {parts[i]}) {parts[i + 1].strip()}'
            continue
        if cur['options'] and len(cur['options']) < 4:
            cur['options'][-1] += ' ' + t
        elif not cur['options']:
            cur['text'].append(t)
    return sections


def fix_ocr(s):
    s = re.sub(r'(?<=Statement)\s*[|!l1]\b', ' I', s)                  # "Statement |" -> "Statement I"
    s = re.sub(r'(?<![A-Za-z])Ill(?![A-Za-z])', 'III', s)
    s = re.sub(r'(?<![A-Za-z])Il(?![A-Za-z])', 'II', s)
    s = re.sub(r'(?<=[\s(,])\|(?=[\s),]|$)', 'I', s)                     # lone "|" used as roman I
    s = re.sub(r'Statement!\s*', 'Statement I ', s)
    s = s.replace('Ca?*', 'Ca²⁺').replace('Ca?+', 'Ca²⁺')
    return re.sub(r'\s{2,}', ' ', s).strip()


def main():
    total, kept = 0, 0
    for i, (name, printed) in enumerate(CHAPTERS):
        p0 = printed - 2
        p1 = (CHAPTERS[i + 1][1] - 3) if i + 1 < len(CHAPTERS) else LAST_PAGE
        secs = parse_chapter(name, p0, p1)
        kmain, ksample = key_text(p0, p1)
        qs = []
        for sec, key in (('main', kmain), ('sample', ksample)):
            for n, q in sorted(secs[sec].items()):
                total += 1
                a = key.get(n)
                text = re.sub(r'^[\s|_—\-–:;.,]+', '', ' '.join(q['text'])).strip()
                if a and len(q['options']) == 4 and all(o.strip() for o in q['options']) and text:
                    qs.append({'test': 'Workbook' if sec == 'main' else 'Workbook sample', 'n': n, 'type': 'mcq', 'difficulty': 'Moderate',
                               'topic': q['topic'], 'text': fix_ocr(text), 'options': [fix_ocr(o) for o in q['options']], 'answer': 'ABCD'[a - 1], 'solution': ''})
        kept += len(qs)
        json.dump({'subject': 'WBBiology', 'chapter': name, 'questions': qs},
                  open(os.path.join(OUT, f'WBBiology_{name.replace(" ", "_")}.json'), 'w'), ensure_ascii=False)
        print(f'{name}: main {len(secs["main"])} (key {len(kmain)}), sample {len(secs["sample"])} (key {len(ksample)}) -> kept {len(qs)}')
    print('TOTAL kept', kept, 'of', total)


if __name__ == '__main__':
    main()
