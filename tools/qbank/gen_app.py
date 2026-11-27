"""Generate the app's question bank from parsed JSON (out/) and WebP images (webp/)."""
import glob, json, os, re, shutil, sys

APP = sys.argv[1]
ORDER = {
    'Physics': ['Mathematics in Physics', 'Units and Dimensions', 'Motion In One Dimension', 'Motion In Two Dimensions', 'Laws of Motion',
                'Work Power Energy', 'Center of Mass Momentum and Collision', 'Rotational Motion', 'Gravitation', 'Mechanical Properties of Solids',
                'Mechanical Properties of Fluids', 'Thermal Properties of Matter', 'Thermodynamics', 'Kinetic Theory of Gases', 'Oscillations',
                'Waves and Sound', 'Electrostatics', 'Capacitance', 'Current Electricity', 'Magnetic Effects of Current', 'Magnetic Properties of Matter',
                'Electromagnetic Induction', 'Alternating Current', 'Electromagnetic Waves', 'Ray Optics', 'Wave Optics', 'Dual Nature of Matter',
                'Atomic Physics', 'Nuclear Physics', 'Semiconductors', 'Communication System'],
    'Chemistry': ['Some Basic Concepts of Chemistry', 'Structure of Atom', 'Classification of Elements and Periodicity in Properties',
                  'Chemical Bonding and Molecular Structure', 'States of Matter', 'Thermodynamics C', 'Chemical Equilibrium', 'Ionic Equilibrium',
                  'Redox Reactions', 'Hydrogen', 's Block Elements', 'p Block Elements Group 13 14', 'General Organic Chemistry', 'Hydrocarbons',
                  'Environmental Chemistry', 'Solid State', 'Solutions', 'Electrochemistry', 'Chemical Kinetics', 'Surface Chemistry',
                  'General Principles and Processes of Isolation of Metals', 'p Block Elements Group 15 16 17 18', 'd and f Block Elements',
                  'Coordination Compounds', 'Haloalkanes and Haloarenes', 'Alcohols Phenols and Ethers', 'Aldehydes and Ketones',
                  'Carboxylic Acid Derivatives', 'Amines', 'Biomolecules', 'Polymers', 'Chemistry in Everyday Life', 'Practical Chemistry'],
    'Maths': ['Basic of Mathematics', 'Sets and Relations', 'Functions', 'Trigonometric Ratios Identities', 'Trigonometric Equations',
              'Complex Number', 'Quadratic Equation', 'Permutation Combination', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines',
              'Circle', 'Parabola', 'Ellipse', 'Hyperbola', 'Limits', 'Mathematical Reasoning', 'Statistics', 'Probability', 'Matrices',
              'Determinants', 'Inverse Trigonometric Functions', 'Continuity and Differentiability', 'Differentiation', 'Application of Derivatives',
              'Indefinite Integration', 'Definite Integration', 'Area Under Curves', 'Differential Equations', 'Vector Algebra',
              'Three Dimensional Geometry', 'Heights and Distances'],
}
DISPLAY = {
    'Thermodynamics C': 'Thermodynamics', 's Block Elements': 's-Block Elements', 'p Block Elements Group 13 14': 'p-Block (Groups 13–14)',
    'p Block Elements Group 15 16 17 18': 'p-Block (Groups 15–18)', 'd and f Block Elements': 'd- and f-Block Elements',
    'Center of Mass Momentum and Collision': 'Centre of Mass, Momentum & Collision', 'Work Power Energy': 'Work, Power & Energy',
    'Motion In One Dimension': 'Motion in One Dimension', 'Motion In Two Dimensions': 'Motion in Two Dimensions',
    'Alcohols Phenols and Ethers': 'Alcohols, Phenols & Ethers', 'Trigonometric Ratios Identities': 'Trigonometric Ratios & Identities',
    'Permutation Combination': 'Permutations & Combinations', 'Complex Number': 'Complex Numbers', 'Quadratic Equation': 'Quadratic Equations',
    'Basic of Mathematics': 'Basic Mathematics', 'Waves and Sound': 'Waves & Sound', 'General Principles and Processes of Isolation of Metals': 'Isolation of Metals (Metallurgy)',
    'Classification of Elements and Periodicity in Properties': 'Periodic Classification', 'Chemical Bonding and Molecular Structure': 'Chemical Bonding',
    'Some Basic Concepts of Chemistry': 'Basic Concepts (Mole Concept)', 'Haloalkanes and Haloarenes': 'Haloalkanes & Haloarenes',
    'Aldehydes and Ketones': 'Aldehydes & Ketones', 'Continuity and Differentiability': 'Continuity & Differentiability',
}
CODE = {'Physics': 'P', 'Chemistry': 'C', 'Maths': 'M', 'NEET Physics': 'NP', 'NEET Chemistry': 'NC'}
# NEET bank (parse_neet.py output in nout/), in NCERT order from the numbered source files
NEET_SRC = os.environ.get('NEET_SRC', '../neet/ex')
for subj, folder, prefix in (('NEET Physics', 'Physics', 'NEETPhysics'), ('NEET Chemistry', 'Chemistry', 'NEETChemistry')):
    files = sorted(f for f in os.listdir(os.path.join(NEET_SRC, folder)) if f.endswith('.docx'))
    ORDER[subj] = [re.sub(r'^\d+_', '', f[:-5]).replace('_', ' ') for f in files]
ORDER['Biology'] = [
    'Biological Classification', 'Plant Kingdom', 'Morphology of Flowering Plants', 'Anatomy of Flowering Plants', 'Cell The Unit of Life',
    'Cell Cycle and Cell Division', 'Photosynthesis in Higher Plants', 'Respiration in Plants', 'Plant Growth and Development',
    'Sexual Reproduction in Flowering Plants', 'Biotechnology Principles and Processes', 'Biotechnology and its Applications',
    'Organisms and Populations', 'Ecosystem', 'The Living World', 'Animal Kingdom Non Chordata', 'Animal Kingdom Chordata',
    'Structural Organisation in Animals', 'Biomolecules', 'Breathing and Exchange of Gases', 'Body Fluids and Circulation',
    'Excretory Products and their Elimination', 'Locomotion and Movement', 'Neural Control and Coordination',
    'Chemical Coordination and Integration', 'Human Reproduction', 'Reproductive Health', 'Principles of Inheritance and Variation',
    'Molecular Basis of Inheritance', 'Evolution', 'Human Health and Disease', 'Microbes in Human Welfare', 'Biodiversity and Conservation']
CODE['Biology'] = 'BI'
DISPLAY.update({'Cell The Unit of Life': 'Cell: The Unit of Life', 'Biotechnology Principles and Processes': 'Biotechnology: Principles & Processes',
                'Animal Kingdom Non Chordata': 'Animal Kingdom: Non-Chordata', 'Animal Kingdom Chordata': 'Animal Kingdom: Chordata'})

# Extra banks merged into a chapter: Brilliant Test Series (parse_bts.py output in bout/), matched by normalised name.
norm = lambda x: re.sub(r'[^a-z]', '', x.lower())
BTS = {}
for f in glob.glob('bout/*.json') + glob.glob('wout/*.json'):
    d = json.load(open(f))
    BTS[(d['subject'], norm(d['chapter']))] = d['questions']
BTS_ALIAS = {'organicchemistrysomebasicprinciplesandtechniques': 'organicchemistrybasicprinciples'}
EXTRA_OF = {'NEET Physics': ['BTSPhysics'], 'NEET Chemistry': ['BTSChemistry'], 'Biology': ['BTSBiology', 'WBBiology']}


def extra_questions(subject, name):
    out = []
    k = norm(name)
    for pre in EXTRA_OF.get(subject, []):
        out += BTS.pop((pre, k), None) or BTS.pop((pre, BTS_ALIAS.get(k, k)), None) or []
    return out


SOURCE = {s: ('out', s) for s in ('Physics', 'Chemistry', 'Maths')}
SOURCE['NEET Physics'] = ('nout', 'NEETPhysics')
SOURCE['NEET Chemistry'] = ('nout', 'NEETChemistry')
DISPLAY.update({
    'Organic Chemistry Some Basic Principles and Techniques': 'Organic Chemistry: Basic Principles', 'The d and f Block Elements': 'd- and f-Block Elements',
    'Hydrogen and s Block Elements': 'Hydrogen & s-Block', 'p Block Elements': 'p-Block Elements', 'Surface Chemistry and Solid State': 'Surface Chemistry & Solid State',
    'Aldehydes Ketones and Carboxylic Acids': 'Aldehydes, Ketones & Carboxylic Acids', 'Polymers and Everyday Chemistry': 'Polymers & Everyday Chemistry',
    'Work Energy and Power': 'Work, Energy & Power', 'System of Particles and Rotational Motion': 'System of Particles & Rotational Motion',
    'Ray Optics and Optical Instruments': 'Ray Optics & Optical Instruments', 'Dual Nature of Radiation and Matter': 'Dual Nature of Radiation & Matter',
    'Electrostatic Potential and Capacitance': 'Electrostatic Potential & Capacitance', 'Electric Charges and Fields': 'Electric Charges & Fields',
    'Moving Charges and Magnetism': 'Moving Charges & Magnetism', 'Magnetism and Matter': 'Magnetism & Matter', 'Units and Measurements': 'Units & Measurements',
})
DIFF = {'Easy': 'E', 'Moderate': 'M', 'Hard': 'H'}
IMG_RE = re.compile(r'\[\[img:([0-9a-f]+)\.\w+\]\]')

dims = json.load(open('webp/manifest.json'))
data_dir = os.path.join(APP, 'src/bank/data')
img_dir = os.path.join(APP, 'assets/qimg')
shutil.rmtree(data_dir, ignore_errors=True)
shutil.rmtree(img_dir, ignore_errors=True)
os.makedirs(data_dir)
os.makedirs(img_dir)

used_imgs, chapters, total, dropped = set(), {}, 0, 0


def fix(s):
    return IMG_RE.sub(lambda m: f'[[img:{m.group(1)}]]', s)


for subject, names in ORDER.items():
    chapters[subject] = []
    for ci, name in enumerate(names):
        if subject in SOURCE:
            folder, prefix = SOURCE[subject]
            base = json.load(open(f'{folder}/{prefix}_{name.replace(" ", "_")}.json'))['questions']
        else:
            base = []
        qs = []
        for q in base + extra_questions(subject, name):
            row = {'t': fix(q['text']), 's': fix(q['solution']), 'd': DIFF[q['difficulty']], 'p': q['topic'], 'k': q['test']}
            if q.get('solution_ai'):
                row['x'] = 1
            if q['type'] == 'mcq':
                if len(q['options']) != 4 or q['answer'] not in ('A', 'B', 'C', 'D') or not q['text']:
                    dropped += 1
                    continue
                row['o'] = [fix(o) for o in q['options']]
                row['a'] = 'ABCD'.index(q['answer'])
            else:
                m = re.match(r'\s*(-?\d+(?:\.\d+)?)', q['answer'])
                if not m or not q['text']:
                    dropped += 1
                    continue
                row['n'] = m.group(1)
            row['i'] = f'{CODE[subject]}{ci:02d}-{len(qs):04d}'
            for field in (row['t'], row['s'], *row.get('o', [])):
                used_imgs.update(IMG_RE.findall(field + ''))  # never matches after fix; collect below
            for field in (row['t'], row['s'], *row.get('o', [])):
                used_imgs.update(re.findall(r'\[\[img:([0-9a-f]+)\]\]', field))
            qs.append(row)
        code = f'{CODE[subject]}{ci:02d}'
        json.dump(qs, open(os.path.join(data_dir, f'{code}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        chapters[subject].append({'name': DISPLAY.get(name, name), 'code': code, 'count': len(qs),
                                  'mcq': sum('a' in q for q in qs), 'num': sum('n' in q for q in qs)})
        total += len(qs)

missing = [h for h in used_imgs if h not in dims]
for h in used_imgs:
    if h in dims:
        shutil.copy(f'webp/{h}.webp', os.path.join(img_dir, f'{h}.webp'))

# index.ts: chapter list + lazy loaders (static requires so Metro bundles them)
lines = ['// AUTO-GENERATED by gen_app.py from the question bank. Do not edit by hand.',
         "import type { BankRow } from './types';", '',
         'export const BANK_CHAPTERS = ' + json.dumps(chapters, ensure_ascii=False, indent=2) + ' as const;', '',
         'export const LOADERS: Record<string, () => BankRow[]> = {']
for subject in ORDER:
    for ch in chapters[subject]:
        lines.append(f"  {ch['code']}: () => require('./data/{ch['code']}.json'),")  # noqa
lines += ['};', '']
open(os.path.join(APP, 'src/bank/index.ts'), 'w').write('\n'.join(lines))

img_lines = ['// AUTO-GENERATED by gen_app.py. Question images: [width, height] and bundled source.',
             'export const IMAGES: Record<string, { w: number; h: number; src: number }> = {']
for h in sorted(used_imgs):
    if h in dims:
        w, hh = dims[h]
        img_lines.append(f"  '{h}': {{ w: {w}, h: {hh}, src: require('../../assets/qimg/{h}.webp') }},")
img_lines += ['};', '']
open(os.path.join(APP, 'src/bank/images.ts'), 'w').write('\n'.join(img_lines))

open(os.path.join(APP, 'src/bank/types.ts'), 'w').write('''/** Compact question row as stored in src/bank/data/*.json. */
export type BankRow = {
  /** id */ i: string;
  /** question text; may contain [[img:<hash>]] tokens */ t: string;
  /** options (MCQ only) */ o?: string[];
  /** correct option index (MCQ only) */ a?: number;
  /** numerical answer (integer-type only) */ n?: string;
  /** solution */ s: string;
  /** difficulty: E | M | H */ d: 'E' | 'M' | 'H';
  /** topic */ p: string;
  /** source test name */ k: string;
  /** 1 = solution written by AI from the answer key */ x?: 1;
};
''')
print(f'questions {total}, dropped {dropped}, images {len(used_imgs)} (missing {len(missing)})')
print('unused extra banks:', sorted(BTS))
print({s: len(c) for s, c in chapters.items()})
