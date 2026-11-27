import { Subject } from './data';

export type FormulaChapter = { chapter: string; items: [string, string][] };

/** Quick-revision formula sheets (Biology: key facts). Works offline. */
const BASE: Record<'Physics' | 'Chemistry' | 'Maths' | 'Biology', FormulaChapter[]> = {
  Physics: [
    { chapter: 'Kinematics', items: [['First equation', 'v = u + at'], ['Second equation', 's = ut + ½at²'], ['Third equation', 'v² = u² + 2as'], ['nth second distance', 'sₙ = u + a(2n − 1)/2'], ['Projectile range', 'R = u² sin 2θ / g'], ['Max height', 'H = u² sin²θ / 2g'], ['Time of flight', 'T = 2u sin θ / g']] },
    { chapter: 'Laws of motion', items: [['Newton II', 'F = ma = dp/dt'], ['Impulse', 'J = FΔt = Δp'], ['Friction', 'f ≤ μN'], ['Banking (no friction)', 'tan θ = v² / rg'], ['Centripetal force', 'F = mv² / r']] },
    { chapter: 'Work, energy, power', items: [['Work', 'W = F·s cos θ'], ['Kinetic energy', 'KE = ½mv² = p²/2m'], ['Potential energy', 'U = mgh'], ['Spring PE', 'U = ½kx²'], ['Power', 'P = W/t = F·v']] },
    { chapter: 'Rotational motion', items: [['Torque', 'τ = r × F = Iα'], ['Angular momentum', 'L = Iω'], ['Rotational KE', 'K = ½Iω²'], ['Ring / disc / sphere', 'MR², ½MR², ⅖MR²'], ['Parallel axis', 'I = I꜀ + Md²'], ['Rolling KE', 'K = ½mv²(1 + k²/R²)']] },
    { chapter: 'Gravitation', items: [['Law of gravitation', 'F = Gm₁m₂ / r²'], ['g at height h', 'g(1 − 2h/R), h ≪ R'], ['Orbital velocity', 'v₀ = √(GM/r)'], ['Escape velocity', 'vₑ = √(2GM/R) ≈ 11.2 km/s'], ["Kepler's 3rd law", 'T² ∝ r³']] },
    { chapter: 'Thermodynamics', items: [['First law', 'ΔQ = ΔU + ΔW'], ['Work (isobaric)', 'W = PΔV'], ['Isothermal work', 'W = nRT ln(V₂/V₁)'], ['Adiabatic', 'PVᵞ = constant'], ['Carnot efficiency', 'η = 1 − T꜀/Tₕ']] },
    { chapter: 'Oscillations & waves', items: [['SHM', 'x = A sin(ωt + φ)'], ['Spring period', 'T = 2π√(m/k)'], ['Pendulum period', 'T = 2π√(L/g)'], ['Wave speed', 'v = fλ'], ['String wave speed', 'v = √(T/μ)'], ['Beats', 'f_beat = |f₁ − f₂|']] },
    { chapter: 'Electrostatics', items: [["Coulomb's law", 'F = kq₁q₂ / r²'], ['Field of point charge', 'E = kq / r²'], ['Potential', 'V = kq / r'], ['Capacitance', 'C = ε₀A / d'], ['Energy in capacitor', 'U = ½CV² = Q²/2C'], ["Gauss's law", 'Φ = q / ε₀']] },
    { chapter: 'Current electricity', items: [["Ohm's law", 'V = IR'], ['Resistance', 'R = ρL / A'], ['Series / parallel', 'R = R₁ + R₂ ; 1/R = 1/R₁ + 1/R₂'], ['Power', 'P = VI = I²R = V²/R'], ['Cell with internal r', 'V = E − Ir'], ['Wheatstone balance', 'P/Q = R/S']] },
    { chapter: 'Magnetism & EMI', items: [['Lorentz force', 'F = q(v × B)'], ['Field at centre of loop', 'B = μ₀I / 2R'], ['Long straight wire', 'B = μ₀I / 2πr'], ['Solenoid', 'B = μ₀nI'], ["Faraday's law", 'ε = −dΦ/dt'], ['Transformer', 'Vₛ/Vₚ = Nₛ/Nₚ']] },
    { chapter: 'Optics', items: [['Mirror formula', '1/v + 1/u = 1/f'], ['Lens formula', '1/v − 1/u = 1/f'], ['Power of lens', 'P = 1/f (m)'], ['Snell’s law', 'n₁ sin i = n₂ sin r'], ['YDSE fringe width', 'β = λD / d'], ['Critical angle', 'sin C = 1/n']] },
    { chapter: 'Modern physics', items: [['Photon energy', 'E = hf = hc/λ'], ['Photoelectric', 'KEₘₐₓ = hf − φ'], ['de Broglie', 'λ = h/p'], ['Bohr radius', 'rₙ = 0.529 n²/Z Å'], ['Bohr energy', 'Eₙ = −13.6 Z²/n² eV'], ['Decay', 'N = N₀e^(−λt), t½ = 0.693/λ']] },
  ],
  Chemistry: [
    { chapter: 'Mole concept', items: [['Moles', 'n = mass / molar mass'], ['Molarity', 'M = moles of solute / L of solution'], ['Molality', 'm = moles of solute / kg of solvent'], ['Avogadro number', 'Nₐ = 6.022 × 10²³'], ['Dilution', 'M₁V₁ = M₂V₂']] },
    { chapter: 'Atomic structure', items: [['Energy of photon', 'E = hν'], ['Rydberg', '1/λ = RZ²(1/n₁² − 1/n₂²)'], ['Uncertainty', 'Δx·Δp ≥ h/4π'], ['Max electrons in shell', '2n²'], ['Orbital angular momentum', '√(l(l+1)) h/2π']] },
    { chapter: 'States & thermodynamics', items: [['Ideal gas', 'PV = nRT'], ['Gibbs energy', 'ΔG = ΔH − TΔS'], ['ΔG and K', 'ΔG° = −RT ln K'], ['Enthalpy', 'ΔH = ΔU + ΔnRT'], ["Graham's law", 'r ∝ 1/√M']] },
    { chapter: 'Equilibrium', items: [['pH', 'pH = −log[H⁺]'], ['Water', 'pH + pOH = 14 (25 °C)'], ['Kp and Kc', 'Kp = Kc(RT)^Δn'], ['Henderson', 'pH = pKa + log([A⁻]/[HA])'], ['Ksp of AB₂', 'Ksp = 4s³']] },
    { chapter: 'Redox & electrochemistry', items: [['Nernst equation', 'E = E° − (0.059/n) log Q'], ['ΔG and E', 'ΔG = −nFE'], ['Faraday I', 'm = ZIt'], ['Cell EMF', 'E°cell = E°cathode − E°anode'], ['Conductance', 'Λm = κ × 1000 / M']] },
    { chapter: 'Chemical kinetics', items: [['First order', 'k = (2.303/t) log(a/(a − x))'], ['Half-life (1st order)', 't½ = 0.693/k'], ['Arrhenius', 'k = A e^(−Ea/RT)'], ['Zero order half-life', 't½ = [A]₀ / 2k']] },
    { chapter: 'Solutions', items: [["Raoult's law", 'p = x·p°'], ['Boiling point elevation', 'ΔTb = i·Kb·m'], ['Freezing point depression', 'ΔTf = i·Kf·m'], ['Osmotic pressure', 'π = iCRT']] },
  ],
  Maths: [
    { chapter: 'Quadratic equations', items: [['Roots', 'x = (−b ± √(b² − 4ac)) / 2a'], ['Sum / product', 'α + β = −b/a, αβ = c/a'], ['Discriminant', 'D = b² − 4ac']] },
    { chapter: 'Sequences & series', items: [['AP nth term', 'aₙ = a + (n − 1)d'], ['AP sum', 'Sₙ = n/2 [2a + (n − 1)d]'], ['GP nth term', 'aₙ = arⁿ⁻¹'], ['GP sum', 'Sₙ = a(rⁿ − 1)/(r − 1)'], ['Infinite GP', 'S = a/(1 − r), |r| < 1'], ['Σn, Σn², Σn³', 'n(n+1)/2, n(n+1)(2n+1)/6, [n(n+1)/2]²']] },
    { chapter: 'Permutations & binomial', items: [['Permutations', 'ⁿPᵣ = n!/(n − r)!'], ['Combinations', 'ⁿCᵣ = n!/(r!(n − r)!)'], ['General term', 'Tᵣ₊₁ = ⁿCᵣ aⁿ⁻ʳ bʳ'], ['Sum of coefficients', '2ⁿ']] },
    { chapter: 'Trigonometry', items: [['Identity', 'sin²x + cos²x = 1'], ['sin 2x / cos 2x', '2 sin x cos x ; cos²x − sin²x'], ['sin(A ± B)', 'sin A cos B ± cos A sin B'], ['tan(A + B)', '(tan A + tan B)/(1 − tan A tan B)'], ['Sine rule', 'a/sin A = b/sin B = c/sin C']] },
    { chapter: 'Limits & differentiation', items: [['Standard limit', 'lim sin x / x = 1'], ['(1 + x)^(1/x)', '→ e as x → 0'], ['d/dx xⁿ', 'nxⁿ⁻¹'], ['Product rule', '(uv)′ = u′v + uv′'], ['Quotient rule', '(u/v)′ = (u′v − uv′)/v²'], ['d/dx sin x, cos x', 'cos x, −sin x']] },
    { chapter: 'Integration', items: [['∫xⁿ dx', 'xⁿ⁺¹/(n + 1) + C'], ['∫1/x dx', 'ln|x| + C'], ['∫eˣ dx', 'eˣ + C'], ['By parts', '∫u dv = uv − ∫v du'], ['∫dx/(x² + a²)', '(1/a) tan⁻¹(x/a) + C']] },
    { chapter: 'Coordinate geometry', items: [['Distance', '√((x₂ − x₁)² + (y₂ − y₁)²)'], ['Slope', 'm = (y₂ − y₁)/(x₂ − x₁)'], ['Point to line distance', '|ax₁ + by₁ + c| / √(a² + b²)'], ['Circle', '(x − h)² + (y − k)² = r²'], ['Parabola y² = 4ax', 'focus (a, 0), directrix x = −a'], ['Ellipse eccentricity', 'e = √(1 − b²/a²)']] },
    { chapter: 'Vectors, matrices & probability', items: [['Dot product', 'a·b = |a||b| cos θ'], ['Cross product', '|a × b| = |a||b| sin θ'], ['|kA| (n×n)', 'kⁿ|A|'], ['Inverse', 'A⁻¹ = adj A / |A|'], ['Probability', 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B)'], ['Bayes', 'P(A|B) = P(B|A)P(A)/P(B)']] },
  ],
  Biology: [
    { chapter: 'Cell biology', items: [['Powerhouse', 'Mitochondria (ATP via oxidative phosphorylation)'], ['Suicidal bag', 'Lysosome'], ['Protein factory', 'Ribosome (70S prokaryote, 80S eukaryote)'], ['Mitosis phases', 'Prophase → Metaphase → Anaphase → Telophase'], ['Crossing over', 'Pachytene of Prophase I (meiosis)']] },
    { chapter: 'Genetics', items: [['Monohybrid F₂', 'Phenotype 3:1, genotype 1:2:1'], ['Dihybrid F₂', '9:3:3:1'], ['Test cross', '1:1 (monohybrid)'], ['Incomplete dominance', '1:2:1 (snapdragon)'], ['Human chromosomes', '46 (23 pairs); gametes 23']] },
    { chapter: 'Molecular basis of inheritance', items: [['Central dogma', 'DNA → RNA → Protein'], ['Chargaff', 'A = T, G = C'], ['Start codon', 'AUG (methionine)'], ['Stop codons', 'UAA, UAG, UGA'], ['Lac operon', 'Inducible; lactose binds repressor'], ['Unwinds DNA', 'Helicase; joins fragments: ligase']] },
    { chapter: 'Plant physiology', items: [['Photosynthesis', '6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂ + 6H₂O'], ['Light reaction site', 'Thylakoid membranes'], ['Calvin cycle site', 'Stroma; first product 3-PGA (C₃)'], ['C₄ first product', 'Oxaloacetic acid (OAA)'], ['Glycolysis net ATP', '2 ATP per glucose']] },
    { chapter: 'Human physiology', items: [['Kidney unit', 'Nephron'], ['Cardiac output', 'Stroke volume × heart rate ≈ 5 L/min'], ['Normal BP', '120/80 mm Hg'], ['Tidal volume', '≈ 500 mL'], ['Insulin / glucagon', 'Lower / raise blood glucose'], ['Universal donor / recipient', 'O− / AB+']] },
    { chapter: 'Ecology & evolution', items: [['10% law', 'Only ~10% energy passes to next trophic level'], ['Hardy–Weinberg', 'p² + 2pq + q² = 1'], ['Logistic growth', 'dN/dt = rN(1 − N/K)'], ['Pyramid of energy', 'Always upright'], ['Natural selection', 'Darwin & Wallace']] },
  ],
};

/** NEET Physics and Chemistry share the same formula sheets. */
export const FORMULAS: Record<Subject, FormulaChapter[]> = {
  ...BASE,
  'NEET Physics': BASE.Physics,
  'NEET Chemistry': BASE.Chemistry,
};
