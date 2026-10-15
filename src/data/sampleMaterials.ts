import { StudySuite, MistakeRecord } from '../types/study';

export const SAMPLE_SUITES: StudySuite[] = [
  {
    id: 'suite-ap-bio',
    subjectTitle: 'AP Biology: Cellular Respiration & Bioenergetics',
    summary:
      'Rigorous unit review synthesizing Glycolysis, Pyruvate Oxidation, Citric Acid Cycle, Oxidative Phosphorylation, Chemiosmotic ATP synthesis, and metabolic feedback inhibition.',
    sourceName: 'Bio_Unit3_Cellular_Respiration.pdf',
    createdAt: Date.now() - 86400000 * 2,
    topics: [
      {
        name: 'Glycolysis & Fermentation',
        description: 'Cytosolic breakdown of glucose to pyruvate and NAD+ regeneration pathways.',
        importanceWeight: 80,
      },
      {
        name: 'Citric Acid Cycle',
        description: 'Mitochondrial matrix decarboxylation, NADH/FADH2 production, substrate phosphorylation.',
        importanceWeight: 85,
      },
      {
        name: 'Oxidative Phosphorylation & Chemiosmosis',
        description: 'Electron transport complexes, electrochemical proton gradient, ATP synthase turbine mechanics.',
        importanceWeight: 95,
      },
      {
        name: 'Allosteric Regulation & Uncoupling',
        description: 'PFK-1 regulation, DNP uncoupling, oligomycin inhibition, metabolic feedback control.',
        importanceWeight: 75,
      },
    ],
    flashcards: [
      {
        id: 'bio-fc-1',
        front: 'What is the net yield of ATP and NADH per glucose molecule produced exclusively in glycolysis?',
        back: '2 net ATP (4 produced, 2 consumed in investment phase) and 2 NADH molecules.',
        topic: 'Glycolysis & Fermentation',
        difficulty: 'easy',
        memoryTip: 'Invest 2, Harvest 4 -> Profit 2.',
      },
      {
        id: 'bio-fc-2',
        front: 'Where are the protein complexes of the electron transport chain physically located in eukaryotic cells?',
        back: 'Embedded in the cristae of the inner mitochondrial membrane.',
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'easy',
        memoryTip: 'Inner membrane folded into cristae to maximize surface area.',
      },
      {
        id: 'bio-fc-3',
        front: 'What is the primary role of molecular oxygen (O2) in aerobic respiration?',
        back: 'It acts as the final/terminal electron acceptor at Complex IV, combining with electrons and protons to form metabolic water.',
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'medium',
        memoryTip: 'Oxygen accepts the final electron baton and quenches into water.',
      },
      {
        id: 'bio-fc-4',
        front: 'How does 2,4-dinitrophenol (DNP) uncouple oxidative phosphorylation from electron transport?',
        back: 'It carries protons directly across the inner membrane, dissipating the proton gradient without passing through ATP synthase; energy is lost as heat.',
        topic: 'Allosteric Regulation & Uncoupling',
        difficulty: 'hard',
        memoryTip: 'DNP = Leaky dam: water spills over, turbine never turns.',
      },
      {
        id: 'bio-fc-5',
        front: 'Which enzyme functions as the primary "pacemaker" regulatory valve for glycolysis?',
        back: 'Phosphofructokinase-1 (PFK-1), allosterically inhibited by ATP and citrate, activated by AMP.',
        topic: 'Allosteric Regulation & Uncoupling',
        difficulty: 'medium',
        memoryTip: 'PFK-1: High energy (ATP) says "stop", low energy (AMP) says "go".',
      },
      {
        id: 'bio-fc-6',
        front: 'Why does FADH2 yield fewer ATP equivalents (~1.5) than NADH (~2.5)?',
        back: 'FADH2 donates its electrons at Complex II, skipping Complex I and thereby pumping fewer total protons across the membrane.',
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'hard',
        memoryTip: 'Complex II enters downstream, missing the first proton pump.',
      },
    ],
    quickPractice: [
      {
        id: 'bio-qp-1',
        question: 'Under strenuous anaerobic conditions in human skeletal muscle, what is the crucial metabolic reason for converting pyruvate to lactate?',
        options: [
          'To generate additional ATP by substrate-level phosphorylation',
          'To regenerate NAD⁺ from NADH so glycolysis can continue running',
          'To remove carbon dioxide from the cellular cytosol',
          'To stimulate mitochondria to undergo fission'
        ],
        correctIndex: 1,
        explanation: 'Glycolysis requires a continuous supply of NAD⁺ to oxidize glyceraldehyde-3-phosphate. Lactate dehydrogenase oxidizes NADH back to NAD⁺, allowing glycolysis to sustain ATP production.',
        misconceptionWarning: 'Lactate synthesis itself produces NO extra ATP; its sole purpose is regenerating NAD⁺.',
        hint: 'Consider what cofactor glycolysis consumes during the payoff phase.',
        topic: 'Glycolysis & Fermentation',
        difficulty: 'easy',
      },
      {
        id: 'bio-qp-2',
        question: 'Which electron transport complex does NOT directly pump protons from the matrix into the intermembrane space?',
        options: [
          'Complex I (NADH dehydrogenase)',
          'Complex II (Succinate dehydrogenase)',
          'Complex III (Cytochrome bc1 complex)',
          'Complex IV (Cytochrome c oxidase)'
        ],
        correctIndex: 1,
        explanation: 'Complex II (succinate dehydrogenase) transfers electrons from FADH2 to coenzyme Q without traversing the membrane to pump protons.',
        misconceptionWarning: 'Many students falsely assume all 4 complexes pump protons equally.',
        hint: 'This complex is shared between the Krebs cycle and ETC.',
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'medium',
      },
      {
        id: 'bio-qp-3',
        question: 'If cellular ATP levels spike dramatically while energy demand is low, which enzyme is allosterically inhibited to decelerate glycolysis?',
        options: [
          'Hexokinase only',
          'Phosphofructokinase-1 (PFK-1)',
          'Pyruvate dehydrogenase',
          'Cytochrome c oxidase'
        ],
        correctIndex: 1,
        explanation: 'PFK-1 possesses an allosteric binding site for ATP. When ATP is abundant, it binds with lower affinity to this regulatory site, inducing a conformational shift that decreases enzyme affinity for its substrate.',
        misconceptionWarning: 'ATP is a substrate for PFK-1, but at high concentrations it acts as an allosteric inhibitor.',
        hint: 'Look for the committed pacemaker enzyme of the preparatory phase.',
        topic: 'Allosteric Regulation & Uncoupling',
        difficulty: 'medium',
      },
      {
        id: 'bio-qp-4',
        question: 'Rotenone inhibits electron transfer from Complex I to ubiquinone. What will be the immediate status of NADH and oxygen consumption in treated mitochondria?',
        options: [
          'NADH will accumulate in reduced form, and oxygen consumption will plummet',
          'NADH will be rapidly oxidized, and oxygen consumption will surge',
          'ATP synthesis will increase due to substrate-level phosphorylation',
          'Proton gradient will reverse and pump protons into the matrix'
        ],
        correctIndex: 0,
        explanation: 'Blocking Complex I prevents NADH from donating its electrons. Therefore, NADH accumulates, NAD⁺ is depleted, and because electron flow to oxygen is halted, oxygen consumption drops to near zero.',
        misconceptionWarning: 'Blocking early complexes freezes electron flow all the way down the wire.',
        hint: 'Think of an electron traffic jam behind Complex I.',
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'hard',
      },
    ],
    deepMockExam: [
      {
        id: 'bio-me-1',
        scenario:
          'A university biochemistry lab prepares suspended isolated rat liver mitochondria provided with succinate as an oxidizable substrate and ADP + inorganic phosphate. They inject Oligomycin at t = 3 min, and subsequently inject 2,4-dinitrophenol (DNP) at t = 7 min.',
        question:
          'Deduce and explain the changes in the rate of oxygen consumption following: (1) the injection of Oligomycin, and (2) the subsequent addition of DNP.',
        options: [
          'Oligomycin inhibits ATP synthase, building proton back-pressure that halts oxygen consumption; DNP then dissipates the gradient, causing rapid oxygen consumption uncoupled from ATP synthesis.',
          'Oligomycin stimulates electron flow; DNP subsequently destroys Complex I causing complete cessation of oxygen use.',
          'Oxygen consumption remains constant throughout because Oligomycin only acts on the outer membrane.',
          'DNP binds irreversibly to Complex IV, preventing any electron transfer to oxygen under all conditions.'
        ],
        correctIndex: 0,
        explanation:
          'Oligomycin blocks the proton pore (F0 subunit) of ATP synthase. Protons cannot re-enter the matrix, creating intense electrochemical back-pressure that thermodynamically halts electron transport and O2 consumption. Adding DNP creates proton leaks across the lipid bilayer, relieving the back-pressure and permitting maximal electron transport and rapid O2 consumption without ATP production.',
        rubric: [
          'Identifies Oligomycin as an ATP synthase F0 pore inhibitor.',
          'Explains electrochemical back-pressure causing deceleration of respiratory electron flow.',
          'Explains DNP ionophore action dissipating proton motive force independent of ATP synthase.',
          'Concludes that oxygen consumption recovers/accelerates after DNP uncoupling.'
        ],
        points: 10,
        timeLimitSeconds: 180,
        topic: 'Oxidative Phosphorylation & Chemiosmosis',
        difficulty: 'hard',
      },
      {
        id: 'bio-me-2',
        scenario:
          'A patient presents with extreme exercise intolerance, chronic lactic acidosis, and muscle weakness. Genomic sequencing reveals a point mutation in the mitochondrial gene MT-CO1, encoding subunit 1 of Cytochrome c Oxidase (Complex IV).',
        question:
          'From a metabolic standpoint, explain why this patient suffers from persistent lactic acidosis even while at rest.',
        options: [
          'Complex IV dysfunction impairs electron flow through the entire ETC, causing mitochondrial NADH to accumulate; high NADH/NAD⁺ ratios force pyruvate conversion to lactate in the cytoplasm.',
          'Cytochrome c oxidase directly synthesizes lactic acid inside the mitochondrial matrix.',
          'The mutation prevents glycolysis from occurring, forcing muscles to ferment fatty acids into lactic acid.',
          'Lack of Complex IV activates hepatic glycogenolysis at ten times the normal velocity.'
        ],
        correctIndex: 0,
        explanation:
          'Complex IV is the terminal cytochrome oxidase passing electrons to O2. When mutated and defective, electron transfer stalls, Complex I and Krebs cycle dehydrogenases cannot oxidize NADH, and high cytosolic NADH/NAD⁺ ratios allosterically drive lactate dehydrogenase to reduce pyruvate into lactate to sustain basal ATP generation.',
        rubric: [
          'Connects Complex IV defect to stalled electron transport.',
          'Explains failure to regenerate NAD+ via oxidative phosphorylation.',
          'Links compensatory reliance on anaerobic glycolysis with pyruvate reduction to lactate.'
        ],
        points: 10,
        timeLimitSeconds: 180,
        topic: 'Allosteric Regulation & Uncoupling',
        difficulty: 'hard',
      },
      {
        id: 'bio-me-3',
        scenario:
          'Evaluate the thermodynamic stoichiometry of complete aerobic respiration. Two cytosolic NADH are produced during glycolysis. In cardiac myocytes, these enter via the Malate-Aspartate shuttle, whereas in fast-twitch skeletal muscle, they enter via the Glycerol-3-Phosphate shuttle.',
        question:
          'Calculate the net ATP disparity between these two tissue types per molecule of glucose oxidized, and explain the mechanistic origin of this difference.',
        options: [
          'Heart tissue yields 2 more ATP than fast-twitch muscle because Malate-Aspartate passes electrons to Complex I (NADH), whereas Glycerol-3-Phosphate passes electrons to Complex II / Ubiquinone (FADH2).',
          'Fast-twitch muscle yields 4 more ATP because glycerol phosphate diffuses faster across membranes.',
          'Zero disparity because NADH always yields exactly 3.0 ATP regardless of shuttle mechanism.',
          'Heart muscle produces 6 less ATP due to the metabolic cost of pumping aspartate.'
        ],
        correctIndex: 0,
        explanation:
          'The malate-aspartate shuttle transfers electrons to mitochondrial NAD⁺, which enters at Complex I and pumps ~10 protons (~2.5 ATP per NADH, total 5 ATP for 2 NADH). The glycerol-3-phosphate shuttle transfers electrons to FAD, entering at ubiquinone / Complex II and pumping only ~6 protons (~1.5 ATP per FADH2, total 3 ATP for 2 NADH). The difference is 5 - 3 = 2 ATP per glucose.',
        rubric: [
          'Distinguishes entry points: Complex I for malate-aspartate vs Ubiquinone/Complex II for glycerol phosphate.',
          'Details proton pumping difference (10 H+ vs 6 H+).',
          'Computes exact mathematical deficit: 2 ATP per glucose molecule.'
        ],
        points: 10,
        timeLimitSeconds: 150,
        topic: 'Glycolysis & Fermentation',
        difficulty: 'hard',
      },
    ],
  },
  {
    id: 'suite-orgo-chem',
    subjectTitle: 'Organic Chemistry: SN1 vs SN2 Mechanisms & Stereochemistry',
    summary:
      'Core organic synthesis unit detailing Bimolecular Nucleophilic Substitution (SN2) vs Unimolecular Nucleophilic Substitution (SN1), solvent polarities, carbocation stability, and Walden inversion.',
    sourceName: 'Orgo_Chapter7_Substitution_Reactions.docx',
    createdAt: Date.now() - 86400000 * 5,
    topics: [
      {
        name: 'SN2 Bimolecular Kinetics & Inversion',
        description: 'Concerted backside nucleophilic attack, stereochemical Walden inversion, steric hindrance order.',
        importanceWeight: 90,
      },
      {
        name: 'SN1 Unimolecular Carbocation Chemistry',
        description: 'Rate-determining leaving group departure, planar carbocation intermediates, racemization vs partial inversion.',
        importanceWeight: 90,
      },
      {
        name: 'Solvent Effects (Protic vs Polar Aprotic)',
        description: 'Hydrogen bonding solvation shells, naked nucleophile reactivity in acetone, DMSO, and DMF.',
        importanceWeight: 80,
      },
    ],
    flashcards: [
      {
        id: 'orgo-fc-1',
        front: 'What stereochemical consequence is universally observed in a pure SN2 substitution at a chiral stereocenter?',
        back: 'Complete inversion of configuration (Walden inversion) due to mandatory backside attack at 180° to the leaving group.',
        topic: 'SN2 Bimolecular Kinetics & Inversion',
        difficulty: 'easy',
        memoryTip: 'SN2 = Umbrella turning inside out in a gust of wind.',
      },
      {
        id: 'orgo-fc-2',
        front: 'What substrate structure is most reactive toward SN2 reactions, and why?',
        back: 'Methyl > 1° > 2° >> 3° (unreactive). Decreasing steric hindrance permits unhindered backside attack on the electrophilic carbon.',
        topic: 'SN2 Bimolecular Kinetics & Inversion',
        difficulty: 'easy',
        memoryTip: 'SN2 hates crowds: smaller carbon = faster attack.',
      },
      {
        id: 'orgo-fc-3',
        front: 'Why do polar aprotic solvents (like DMSO, acetone, DMF) dramatically accelerate SN2 rates?',
        back: 'They solvate cations effectively but cannot hydrogen-bond to anions, leaving the nucleophile "naked" and energetically potent.',
        topic: 'Solvent Effects (Protic vs Polar Aprotic)',
        difficulty: 'medium',
        memoryTip: 'Aprotic = Unshielded / naked nucleophiles strike hard.',
      },
    ],
    quickPractice: [
      {
        id: 'orgo-qp-1',
        question: 'Which of the following reaction conditions most strongly favors an SN2 mechanism over an SN1 mechanism for 2-bromobutane?',
        options: [
          'High concentration of strong nucleophile (NaOCH3) in polar aprotic solvent (DMF)',
          'Weak nucleophile (CH3OH) in polar protic solvent (H2O)',
          'Very dilute concentration of nucleophile in boiling water',
          'Silver nitrate in ethanol'
        ],
        correctIndex: 0,
        explanation: 'SN2 rate depends on both substrate and nucleophile concentration [Rate = k[R-X][Nu-]]. A strong nucleophile (methoxide) and polar aprotic solvent (DMF) preserve nucleophile nucleophilicity and force direct backside displacement.',
        misconceptionWarning: 'Weak nucleophiles and protic solvents favor carbocation formation (SN1/E1).',
        hint: 'SN2 requires a strong, reactive nucleophile that does not wait for a carbocation.',
        topic: 'SN2 Bimolecular Kinetics & Inversion',
        difficulty: 'medium',
      },
    ],
    deepMockExam: [
      {
        id: 'orgo-me-1',
        scenario:
          'An enantiomerically pure sample of (R)-2-iodooctane is reacted with sodium cyanide in anhydrous DMSO. The product is isolated and analyzed via polarimetry.',
        question:
          'Predict the specific configuration of the isolated 2-methyloctanenitrile product and evaluate the kinetic order of this substitution.',
        options: [
          'Pure (S) configuration with second-order kinetics Rate = k[(R)-2-iodooctane][CN⁻].',
          'Racemic mixture (50% R, 50% S) with first-order kinetics Rate = k[(R)-2-iodooctane].',
          'Pure (R) configuration with retention of stereochemistry via double inversion.',
          'Zero substitution occurs because cyanide is too bulky to displace iodide.'
        ],
        correctIndex: 0,
        explanation:
          'Iodide on a secondary carbon with a strong nucleophile (cyanide) in polar aprotic DMSO reacts strictly via SN2. Backside attack causes clean inversion from (R) to (S). The rate law is second order.',
        rubric: [
          'Identifies SN2 as predominant mechanism.',
          'Explains backside displacement causing configuration inversion from (R) to (S).',
          'States second-order kinetics.'
        ],
        points: 10,
        timeLimitSeconds: 140,
        topic: 'SN2 Bimolecular Kinetics & Inversion',
        difficulty: 'medium',
      },
    ],
  },
];

// Pre-seeded initial mistake records so the student can immediately observe the Mistake Vault,
// diagnostic charts, error categorization, and AI improvement recommendations.
export const INITIAL_MISTAKES: MistakeRecord[] = [
  {
    id: 'mstk-1',
    questionId: 'bio-qp-2',
    question: 'Which electron transport complex does NOT directly pump protons from the matrix into the intermembrane space?',
    scenario: undefined,
    options: [
      'Complex I (NADH dehydrogenase)',
      'Complex II (Succinate dehydrogenase)',
      'Complex III (Cytochrome bc1 complex)',
      'Complex IV (Cytochrome c oxidase)'
    ],
    userAnswerIndex: 2,
    correctAnswerIndex: 1,
    userAnswerText: 'Complex III (Cytochrome bc1 complex)',
    correctAnswerText: 'Complex II (Succinate dehydrogenase)',
    explanation: 'Complex II transfers electrons from FADH2 to ubiquinone without directly pumping protons into the intermembrane space.',
    topic: 'Oxidative Phosphorylation & Chemiosmosis',
    sourceType: 'quick_practice',
    sourceSuiteTitle: 'AP Biology: Cellular Respiration & Bioenergetics',
    timestamp: Date.now() - 3600000 * 4,
    attemptCount: 1,
    status: 'unresolved',
    category: 'detail_recall',
  },
  {
    id: 'mstk-2',
    questionId: 'bio-me-1',
    question: 'Deduce and explain the changes in the rate of oxygen consumption following: (1) the injection of Oligomycin, and (2) the subsequent addition of DNP.',
    scenario: 'Isolated rat liver mitochondria treated with Oligomycin followed by 2,4-dinitrophenol (DNP).',
    options: [
      'Oligomycin inhibits ATP synthase, building proton back-pressure that halts oxygen consumption; DNP then dissipates the gradient, causing rapid oxygen consumption uncoupled from ATP synthesis.',
      'Oligomycin stimulates electron flow; DNP subsequently destroys Complex I causing complete cessation of oxygen use.',
      'Oxygen consumption remains constant throughout because Oligomycin only acts on the outer membrane.',
      'DNP binds irreversibly to Complex IV, preventing any electron transfer to oxygen under all conditions.'
    ],
    userAnswerIndex: 2,
    correctAnswerIndex: 0,
    userAnswerText: 'Oxygen consumption remains constant throughout because Oligomycin only acts on the outer membrane.',
    correctAnswerText: 'Oligomycin inhibits ATP synthase, building proton back-pressure that halts oxygen consumption; DNP then dissipates the gradient, causing rapid oxygen consumption uncoupled from ATP synthesis.',
    explanation: 'Oligomycin blocks the proton pore (F0 subunit) of ATP synthase. The resulting back-pressure halts electron flow until uncoupled by DNP.',
    topic: 'Oxidative Phosphorylation & Chemiosmosis',
    sourceType: 'mock_exam',
    sourceSuiteTitle: 'AP Biology: Cellular Respiration & Bioenergetics',
    timestamp: Date.now() - 3600000 * 18,
    attemptCount: 1,
    status: 'unresolved',
    category: 'concept_confusion',
  },
  {
    id: 'mstk-3',
    questionId: 'bio-me-3',
    question: 'Calculate the net ATP disparity between cardiac myocytes and fast-twitch skeletal muscle per molecule of glucose oxidized, and explain the mechanistic origin of this difference.',
    scenario: 'Comparison between Malate-Aspartate and Glycerol-3-Phosphate shuttles for cytosolic NADH.',
    options: [
      'Heart tissue yields 2 more ATP than fast-twitch muscle because Malate-Aspartate passes electrons to Complex I (NADH), whereas Glycerol-3-Phosphate passes electrons to Complex II / Ubiquinone (FADH2).',
      'Fast-twitch muscle yields 4 more ATP because glycerol phosphate diffuses faster across membranes.',
      'Zero disparity because NADH always yields exactly 3.0 ATP regardless of shuttle mechanism.',
      'Heart muscle produces 6 less ATP due to the metabolic cost of pumping aspartate.'
    ],
    userAnswerIndex: 1,
    correctAnswerIndex: 0,
    userAnswerText: 'Fast-twitch muscle yields 4 more ATP because glycerol phosphate diffuses faster across membranes.',
    correctAnswerText: 'Heart tissue yields 2 more ATP than fast-twitch muscle because Malate-Aspartate passes electrons to Complex I (NADH), whereas Glycerol-3-Phosphate passes electrons to Complex II / Ubiquinone (FADH2).',
    explanation: 'Malate-aspartate yields ~2.5 ATP/NADH, whereas glycerol-3-phosphate enters at ubiquinone yielding ~1.5 ATP/FADH2. 2 NADH × (2.5 - 1.5) = 2 ATP net deficit.',
    topic: 'Glycolysis & Fermentation',
    sourceType: 'mock_exam',
    sourceSuiteTitle: 'AP Biology: Cellular Respiration & Bioenergetics',
    timestamp: Date.now() - 3600000 * 36,
    attemptCount: 2,
    status: 'reviewing',
    category: 'calculation',
  },
];
