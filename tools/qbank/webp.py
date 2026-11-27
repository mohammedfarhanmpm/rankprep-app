import os, glob, json, sys
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
os.makedirs('webp', exist_ok=True)
def conv(f):
    name = os.path.splitext(os.path.basename(f))[0]
    o = f'webp/{name}.webp'
    im = Image.open(f)
    if im.mode in ('P', 'LA', 'RGBA', 'PA'):
        im2 = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im2, mask=im2.split()[3]); im = bg
    else:
        im = im.convert('RGB')
    if im.width > 800:
        im = im.resize((800, int(im.height * 800 / im.width)), Image.LANCZOS)
    im.save(o, 'WEBP', quality=45, method=6)
    return name, im.width, im.height
src_dirs = sys.argv[1:] or ['out/img']
files = sorted(f for d in src_dirs for f in glob.glob(os.path.join(d, '*')))
with ProcessPoolExecutor() as ex:
    res = list(ex.map(conv, files, chunksize=20))
json.dump({n: [w, h] for n, w, h in res}, open('webp/manifest.json', 'w'))
print(len(res))
