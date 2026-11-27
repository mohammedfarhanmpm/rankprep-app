"""Parse question-bank .docx files into JSON.

Each docx: headings "<Chapter> - Test N (Topic Test)" / "- Chapter Test", then questions:
  Heading3 "Q1 (MCQ · Easy)" | "Chapter: X Topic: Y" | body | (A)..(D) | "✅ Answer: B" | "Solution:" | solution...
Word equations (OMML) are converted to readable Unicode text, images to [[img:<name>]] tokens.
"""
import json, os, re, sys, zipfile, hashlib
import xml.etree.ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'v': 'urn:schemas-microsoft-com:vml',
}
W = '{%s}' % NS['w']
M = '{%s}' % NS['m']
A = '{%s}' % NS['a']
R = '{%s}' % NS['r']

SUP = dict(zip('0123456789+-−=()nixyabcdefghjklmoprstuvwzTABDEGHIJKLMNOPRUVW', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻⁼⁽⁾ⁿⁱˣʸᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷᶻᵀᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵁⱽᵂ'))
SUB = dict(zip('0123456789+-−=()aehijklmnoprstuvx', '₀₁₂₃₄₅₆₇₈₉₊₋₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ'))


def script(s, table, mark):
    s = s.strip()
    if mark == '^' and s in ('∘', '°', 'o', '0') and table is SUP and s != '0' and s != 'o':
        return '°'
    if s and all(ch in table for ch in s):
        return ''.join(table[ch] for ch in s)
    return f'{mark}({s})' if len(s) > 1 else f'{mark}{s}'


def needs_paren(s):
    s = s.strip()
    if len(s) <= 1:
        return False
    if re.fullmatch(r'[\w.²³⁰¹⁴⁵⁶⁷⁸⁹⁻√π]+', s):
        return False
    if s.startswith('(') and s.endswith(')') and s.count('(') == 1:
        return False
    return True


def par(s):
    return f'({s})' if needs_paren(s) else s


def attr(el, path, name='val'):
    x = el.find(path, NS)
    return x.get(M + name) if x is not None else None


def omml(el):
    """Convert an OMML element to linear Unicode text."""
    tag = el.tag
    kids = lambda: ''.join(omml(c) for c in el)
    if tag == M + 'r':
        return ''.join(t.text or '' for t in el.iter(M + 't'))
    if tag in (M + 'oMath', M + 'oMathPara', M + 'e', M + 'num', M + 'den', M + 'sup', M + 'sub', M + 'deg', M + 'fName', M + 'lim', M + 'box', M + 'borderBox'):
        return ''.join(omml(c) for c in el if not c.tag.endswith('Pr'))
    if tag == M + 'sSup':
        return omml(el.find('m:e', NS)) + script(omml(el.find('m:sup', NS)), SUP, '^')
    if tag == M + 'sSub':
        return omml(el.find('m:e', NS)) + script(omml(el.find('m:sub', NS)), SUB, '_')
    if tag == M + 'sSubSup':
        return omml(el.find('m:e', NS)) + script(omml(el.find('m:sub', NS)), SUB, '_') + script(omml(el.find('m:sup', NS)), SUP, '^')
    if tag == M + 'sPre':
        return script(omml(el.find('m:sub', NS)), SUB, '_') + script(omml(el.find('m:sup', NS)), SUP, '^') + omml(el.find('m:e', NS))
    if tag == M + 'f':
        n, d = omml(el.find('m:num', NS)), omml(el.find('m:den', NS))
        if attr(el, 'm:fPr/m:type') == 'noBar':
            return f'({n} over {d})'
        return f'{par(n)}/{par(d)}'
    if tag == M + 'rad':
        deg = el.find('m:deg', NS)
        dt = omml(deg).strip() if deg is not None else ''
        body = omml(el.find('m:e', NS))
        root = {'': '√', '2': '√', '3': '∛', '4': '∜'}.get(dt, f'{script(dt, SUP, "^")}√')
        return root + (f'({body})' if needs_paren(body) else body)
    if tag == M + 'd':
        beg = attr(el, 'm:dPr/m:begChr')
        end = attr(el, 'm:dPr/m:endChr')
        sep = attr(el, 'm:dPr/m:sepChr')
        beg = '(' if beg is None else beg
        end = ')' if end is None else end
        sep = ', ' if sep is None else sep
        return beg + sep.join(omml(e) for e in el.findall('m:e', NS)) + end
    if tag == M + 'nary':
        ch = attr(el, 'm:naryPr/m:chr') or '∫'
        lo = el.find('m:sub', NS)
        hi = el.find('m:sup', NS)
        lo = omml(lo).strip() if lo is not None else ''
        hi = omml(hi).strip() if hi is not None else ''
        lim = (f'_{par(lo)}' if lo else '') + (f'^{par(hi)}' if hi else '')
        return f'{ch}{lim} ' + omml(el.find('m:e', NS))
    if tag == M + 'func':
        return omml(el.find('m:fName', NS)).strip() + ' ' + omml(el.find('m:e', NS))
    if tag == M + 'limLow':
        return omml(el.find('m:e', NS)) + '_(' + omml(el.find('m:lim', NS)) + ') '
    if tag == M + 'limUpp':
        return omml(el.find('m:e', NS)) + '^(' + omml(el.find('m:lim', NS)) + ')'
    if tag == M + 'acc':
        ch = attr(el, 'm:accPr/m:chr') or '̂'
        base = omml(el.find('m:e', NS))
        if ch in ('→', '⃗'):
            return base + '⃗' if len(base) == 1 else f'vec({base})'
        if ch in ('˙', '̇'):
            return base + '̇'
        return base + (ch if len(ch) == 1 and 0x300 <= ord(ch) < 0x370 else '̂')
    if tag == M + 'bar':
        base = omml(el.find('m:e', NS))
        return base + '̅' if len(base) == 1 else f'bar({base})'
    if tag == M + 'groupChr':
        return omml(el.find('m:e', NS))
    if tag == M + 'eqArr':
        return '; '.join(omml(e) for e in el.findall('m:e', NS))
    if tag == M + 'm':
        rows = ['  '.join(omml(e) for e in mr.findall('m:e', NS)) for mr in el.findall('m:mr', NS)]
        return '[' + '; '.join(rows) + ']'
    if tag.endswith('Pr') or tag == M + 'ctrlPr':
        return ''
    return kids()


class Doc:
    def __init__(self, path, img_dir, prefix):
        self.z = zipfile.ZipFile(path)
        self.img_dir = img_dir
        self.prefix = prefix
        rels = ET.fromstring(self.z.read('word/_rels/document.xml.rels'))
        self.rels = {r.get('Id'): r.get('Target') for r in rels}
        self.images = {}

    def image(self, rid):
        target = self.rels.get(rid)
        if not target:
            return None
        data = self.z.read('word/' + target.lstrip('/').replace('word/', '', 1) if not target.startswith('media') else 'word/' + target)
        h = hashlib.sha1(data).hexdigest()[:12]
        ext = os.path.splitext(target)[1].lower() or '.png'
        name = f'{h}{ext}'
        out = os.path.join(self.img_dir, name)
        if not os.path.exists(out):
            with open(out, 'wb') as f:
                f.write(data)
        self.images[name] = len(data)
        return name

    def run_text(self, el):
        out = []
        for c in el.iter():
            if c.tag == W + 't':
                out.append(c.text or '')
            elif c.tag == W + 'tab':
                out.append(' ')
            elif c.tag in (W + 'br', W + 'cr'):
                out.append('\n')
            elif c.tag == A + 'blip':
                name = self.image(c.get(R + 'embed'))
                if name:
                    out.append(f' [[img:{name}]] ')
            elif c.tag == W + 'sym':
                try:
                    out.append(chr(int(c.get(W + 'char'), 16)))
                except Exception:
                    pass
        return ''.join(out)

    def para_text(self, p):
        out = []
        for c in p:
            if c.tag == W + 'r':
                out.append(self.run_text(c))
            elif c.tag in (M + 'oMath', M + 'oMathPara'):
                out.append(omml(c))
            elif c.tag in (W + 'hyperlink', W + 'smartTag', W + 'ins', W + 'fldSimple'):
                out.append(self.para_text(c))
        return re.sub(r'[  ]+', ' ', ''.join(out)).strip()

    def blocks(self):
        """Yield (style, text) for paragraphs and tables in document order."""
        root = ET.fromstring(self.z.read('word/document.xml'))
        body = root.find('w:body', NS)
        for el in body:
            if el.tag == W + 'p':
                st = el.find('w:pPr/w:pStyle', NS)
                yield (st.get(W + 'val') if st is not None else ''), self.para_text(el)
            elif el.tag == W + 'tbl':
                rows = []
                for tr in el.findall('.//w:tr', NS):
                    cells = [' '.join(self.para_text(p) for p in tc.findall('.//w:p', NS)).strip() for tc in tr.findall('w:tc', NS)]
                    rows.append(' | '.join(cells))
                yield 'Table', '\n'.join(rows)


QHEAD = re.compile(r'^Q(\d+)\s*\((MCQ|Numerical|[^·)]+?)\s*·\s*(Easy|Moderate|Hard)\)', re.I)
OPT = re.compile(r'^\(([A-D])\)\s*(.*)$', re.S)
ANS = re.compile(r'^✅\s*Answer:\s*(.*)$')
META = re.compile(r'^Chapter:\s*(.*?)\s+Topic:\s*(.*)$')


def clean(s):
    s = re.sub(r'\s*\\\[\s*', ' [', s)
    s = s.replace('\\]', ']').replace('\\!', '').replace('\\_', '_')
    s = re.sub(r'(?m)^\s*[\^:/.]\s*$', '', s)          # stray marker lines
    s = re.sub(r'\s+[\^:/]\s*$', '', s)                 # stray marker at end
    s = s.replace('undefined', '')
    s = s.replace('^∘', '°').replace('^(∘)', '°').replace('∘C', '°C')
    s = re.sub(r'(?m)^\s*[()]\s*$', '', s)               # lone bracket lines
    s = re.sub(r'\(\s*\)', '', s)                         # empty brackets
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def parse(path, img_dir):
    subject, chapter_file = os.path.basename(path)[:-5].split('_', 1)
    d = Doc(path, img_dir, subject)
    qs, test, cur, mode = [], '', None, None

    def flush():
        nonlocal cur
        if cur:
            for k in ('text', 'solution'):
                cur[k] = clean('\n'.join(cur[k]))
            cur['options'] = [clean(o) for o in cur['options']]
            qs.append(cur)
        cur = None

    for style, text in d.blocks():
        if not text:
            continue
        if style.startswith('Heading') and style != 'Heading3' and ' - ' in text:
            flush()
            test = text.split(' - ', 1)[1]
            continue
        m = QHEAD.match(text)
        if m and (style == 'Heading3' or style == ''):
            flush()
            cur = {'test': test, 'n': int(m.group(1)), 'type': 'numerical' if m.group(2).lower().startswith('num') else 'mcq',
                   'difficulty': m.group(3).capitalize(), 'topic': '', 'text': [], 'options': [], 'answer': '', 'solution': []}
            mode = 'meta'
            continue
        if cur is None:
            continue
        mm = META.match(text)
        if mode == 'meta' and mm:
            cur['topic'] = mm.group(2).strip()
            mode = 'text'
            continue
        if mode == 'meta':
            mode = 'text'
        om = OPT.match(text)
        if om and mode in ('text', 'opts') and len(cur['options']) == 'ABCD'.index(om.group(1)):
            cur['options'].append(om.group(2))
            mode = 'opts'
            continue
        am = ANS.match(text)
        if am:
            cur['answer'] = am.group(1).strip()
            mode = 'ans'
            continue
        if text.startswith('Solution:'):
            mode = 'sol'
            rest = text[len('Solution:'):].strip()
            if rest:
                cur['solution'].append(rest)
            continue
        if mode == 'text':
            cur['text'].append(text)
        elif mode == 'opts':
            cur['options'][-1] += '\n' + text
        elif mode == 'sol':
            cur['solution'].append(text)
    flush()
    return subject, chapter_file.replace('_', ' '), qs, d.images


if __name__ == '__main__':
    src, out_dir = sys.argv[1], sys.argv[2]
    img_dir = os.path.join(out_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    summary = []
    for f in sorted(os.listdir(src)):
        if not f.endswith('.docx'):
            continue
        subject, chapter, qs, imgs = parse(os.path.join(src, f), img_dir)
        bad = [q for q in qs if q['type'] == 'mcq' and (len(q['options']) != 4 or q['answer'] not in 'ABCD' or not q['answer'])]
        with open(os.path.join(out_dir, f[:-5] + '.json'), 'w') as fh:
            json.dump({'subject': subject, 'chapter': chapter, 'questions': qs}, fh, ensure_ascii=False)
        summary.append((f, len(qs), len(bad), len(imgs), sum(imgs.values())))
        print(f'{f}: {len(qs)} questions, {len(bad)} malformed, {len(imgs)} images ({sum(imgs.values())//1024} KB)')
    print('TOTAL', sum(s[1] for s in summary), 'questions,', sum(s[2] for s in summary), 'malformed,', sum(s[4] for s in summary) // 1024, 'KB images')
