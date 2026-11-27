"""OCR a two-column workbook PDF into per-page text (left column then right column).

Pages are rendered at 300 dpi, coloured text is turned black, each column is OCR'd with Tesseract,
and words are re-assembled into lines by their y position (so question numbers stay on their line).
Also extracts embedded images per column with their vertical position, as [[img:...]] lines.
Usage: python3 ocr_pages.py <pdf> <out_dir> <first_page> <last_page> [workers]
"""
import csv, io, json, os, subprocess, sys, hashlib
from concurrent.futures import ProcessPoolExecutor
from PIL import Image

PDF, OUT, FIRST, LAST = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
WORKERS = int(sys.argv[5]) if len(sys.argv) > 5 else 4
os.makedirs(os.path.join(OUT, 'txt'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)


def lines_from_tsv(tsv):
    words = []
    for r in csv.DictReader(io.StringIO(tsv), delimiter='\t', quoting=csv.QUOTE_NONE):
        try:
            if float(r['conf']) < 0 or not (r['text'] or '').strip():
                continue
        except (ValueError, TypeError):
            continue
        top, h, left = int(float(r['top'])), int(float(r['height'])), int(float(r['left']))
        words.append((top + h / 2, left, h, r['text']))
    words.sort()
    lines = []
    for cy, x, h, t in words:
        if lines and abs(cy - lines[-1]['cy']) < max(12, h * 0.45):
            lines[-1]['w'].append((x, t))
        else:
            lines.append({'cy': cy, 'w': [(x, t)], 'x': x})
    out = []
    for ln in lines:
        ln['w'].sort()
        out.append((ln['cy'], ln['w'][0][0], ' '.join(t for _, t in ln['w'])))
    return out


def figure_boxes(gray):
    """Find large non-text regions (diagrams) as bounding boxes using a coarse density grid."""
    W, H = gray.size
    small = gray.resize((W // 8, H // 8))
    px = small.load()
    w, h = small.size
    rows = []
    for y in range(h):
        dark = sum(1 for x in range(w) if px[x, y] < 200)
        rows.append(dark)
    return rows


def ocr_page(p):
    out_txt = os.path.join(OUT, 'txt', f'{p:04d}.json')
    if os.path.exists(out_txt):
        return p
    png = os.path.join(OUT, f'_p{p}')
    subprocess.run(['pdftoppm', '-r', '300', '-f', str(p), '-l', str(p), '-png', '-singlefile', PDF, png], check=True)
    im = Image.open(png + '.png').convert('L')
    W, H = im.size
    bw = im.point(lambda v: 0 if v < 215 else 255)
    cols = []
    for k, (x0, x1) in enumerate(((0, W // 2), (W // 2, W))):
        y0, y1 = int(H * 0.035), int(H * 0.955)
        crop = bw.crop((x0, y0, x1, y1))
        f = os.path.join(OUT, f'_c{p}_{k}.png')
        crop.save(f)
        tsv = subprocess.run(['tesseract', f, '-', '--psm', '4', 'tsv'], capture_output=True, text=True).stdout
        cols.append([(cy + y0, x, t) for cy, x, t in lines_from_tsv(tsv)])
        os.remove(f)
    # embedded images with positions (bbox in points) via pdfimages list is not positional; crop figures instead:
    figs = find_figures(im, cols, p)
    os.remove(png + '.png')
    json.dump({'page': p, 'cols': cols, 'figs': figs}, open(out_txt, 'w'))
    return p


def find_figures(im, cols, p):
    """Crop tall regions that contain ink but no OCR text (diagrams). Returns [{'col', 'y', 'name'}]."""
    W, H = im.size
    figs = []
    for k, (x0, x1) in enumerate(((0, W // 2), (W // 2, W))):
        text_rows = set()
        for cy, _, t in cols[k]:
            for yy in range(int(cy) - 28, int(cy) + 28):
                text_rows.add(yy // 10)
        col = im.crop((x0 + 40, 0, x1 - 40, H)).resize(((x1 - x0 - 80) // 10, H // 10))
        pxs = col.load()
        cw, ch = col.size
        ink = [sum(1 for x in range(cw) if pxs[x, y] < 180) > 2 and y not in text_rows for y in range(ch)]
        y, top, bottom = 0, int(ch * 0.04), int(ch * 0.95)
        y = top
        while y < bottom:
            if ink[y]:
                s = y
                gap = 0
                while y < bottom and gap < 4:
                    gap = 0 if ink[y] else gap + 1
                    y += 1
                e = y - gap
                if e - s >= 15:  # at least ~150 px (half an inch) tall
                    box = (x0 + 20, max(0, s * 10 - 20), x1 - 20, min(H, e * 10 + 20))
                    crop = im.crop(box)
                    # trim white margins
                    inv = crop.point(lambda v: 255 if v < 200 else 0)
                    bb = inv.getbbox()
                    if bb:
                        crop = crop.crop((max(0, bb[0] - 10), max(0, bb[1] - 10), min(crop.width, bb[2] + 10), min(crop.height, bb[3] + 10)))
                    if crop.width > 1000:
                        crop = crop.resize((1000, int(crop.height * 1000 / crop.width)))
                    buf = io.BytesIO()
                    crop.save(buf, 'PNG')
                    name = hashlib.sha1(buf.getvalue()).hexdigest()[:12]
                    open(os.path.join(OUT, 'img', name + '.png'), 'wb').write(buf.getvalue())
                    figs.append({'col': k, 'y': (s + e) * 5, 'name': name})
            y += 1
    return figs


if __name__ == '__main__':
    pages = list(range(FIRST, LAST + 1))
    with ProcessPoolExecutor(WORKERS) as ex:
        for p in ex.map(ocr_page, pages):
            if p % 25 == 0:
                print('page', p, flush=True)
    print('done', len(pages))
