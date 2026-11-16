import { AgeGroup, GiftOccasion, Product, ProductAngle, ProductCategory } from '../types';

export const BRAND_LOGO_URL =
  '/assets/aistudio/WhatsApp_Image_2026-11-16_at_11.18.26_AM_4fe8444e.jpeg';

export const HERO_IMAGE = '/assets/images/hero_brain_toys_1794767911110.jpg';

const IMG_MOTOR = '/assets/images/toy_motor_front_1794767911807.jpg';
const IMG_ENGINEERING = '/assets/images/toy_engineering_front_1794767911598.jpg';
const IMG_MATHS = '/assets/images/toy_maths_front_1794767911382.jpg';
const IMG_IMAGINATION = '/assets/images/toy_imagination_front_1794767912731.jpg';
const IMG_MECHANISM = '/assets/images/toy_mechanism_inside_1794767912639.jpg';
const IMG_SCALE = '/assets/images/toy_hands_on_scale_1794767913261.jpg';
const IMG_BINARY_STEM = '/assets/images/toy_binary_stem_front_1794767914261.jpg';

function makeGallery(
  frontUrl: string,
  frontPos: string,
  mechUrl: string,
  mechPos: string,
  scaleUrl: string,
  scalePos: string
): [ProductAngle, ProductAngle, ProductAngle] {
  return [
    {
      id: 'front',
      label: 'View 1: Front',
      shortLabel: 'Front',
      url: frontUrl,
      objectPosition: frontPos,
    },
    {
      id: 'mechanism',
      label: 'View 2: Mechanism/Inside',
      shortLabel: 'Mechanism',
      url: mechUrl,
      objectPosition: mechPos,
    },
    {
      id: 'scale',
      label: 'View 3: Hands-On Scale',
      shortLabel: 'Scale',
      url: scaleUrl,
      objectPosition: scalePos,
    },
  ];
}

export interface AgeGroupMeta {
  ageGroup: Exclude<AgeGroup, AgeGroup.ALL>;
  filterLabel: string;
  shortSubtitle: string;
  sectionHeadline: string;
  sectionSubtextHi: string;
  badgeClasses: string;
  accentDotClass: string;
}

export const AGE_GROUP_META: AgeGroupMeta[] = [
  {
    ageGroup: AgeGroup.AGE_3_5,
    filterLabel: '3–5 Years (Sensory & Grip)',
    shortSubtitle: 'Early Sensory & Grip',
    sectionHeadline: 'Early Brain, Bilateral Coordination & Sensory Grip',
    sectionSubtextHi:
      'Between ages 3 and 5, rapid neural pathways form through finger precision, two-hand coordination, and calm tactile storytelling.',
    badgeClasses:
      'bg-emerald-500/15 text-emerald-800 border-emerald-500/35 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/35',
    accentDotClass: 'bg-emerald-500',
  },
  {
    ageGroup: AgeGroup.AGE_6_8,
    filterLabel: '6–8 Years (Spatial IQ & Logic)',
    shortSubtitle: 'Spatial IQ & Logic',
    sectionHeadline: 'Foundational Logic, Spatial IQ & Strategy',
    sectionSubtextHi:
      'Ages 6 to 8 build spatial visualization, geometric intuition, step-by-step planning, and patient hands-on problem solving.',
    badgeClasses:
      'bg-sky-500/15 text-sky-800 border-sky-500/35 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-400/35',
    accentDotClass: 'bg-sky-500',
  },
  {
    ageGroup: AgeGroup.AGE_9_11,
    filterLabel: '9–11 Years (Deep Focus & Math)',
    shortSubtitle: 'Deep Focus & Math',
    sectionHeadline: 'Deep Focus, Deduction & Applied Geometry',
    sectionSubtextHi:
      'Channels restless energy at ages 9 to 11 into sustained concentration, deductive reasoning, symmetry, and equilibrium physics.',
    badgeClasses:
      'bg-violet-500/15 text-violet-800 border-violet-500/35 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-400/35',
    accentDotClass: 'bg-violet-500',
  },
  {
    ageGroup: AgeGroup.AGE_12_15,
    filterLabel: '12–15 Years (STEM & Robotics)',
    shortSubtitle: 'STEM & Robotics',
    sectionHeadline: 'Mechanical Computing, Golden Ratio & Robotics',
    sectionSubtextHi:
      'Screen-free engineering kits for ages 12 to 15 covering binary gate logic, spur-gear transmissions, and kinematic linkages.',
    badgeClasses:
      'bg-amber-500/15 text-amber-800 border-amber-500/35 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/35',
    accentDotClass: 'bg-amber-500',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // =========================================================================
  // AGE GROUP 1: 3–5 Years (Early Brain, Bilateral Coordination & Sensory Grip)
  // =========================================================================
  {
    id: 'bee4-mame-tsukami-chopsticks',
    title: 'Mame-Tsukami Spring Chopstick Precision Game',
    category: ProductCategory.MOTOR_SKILLS,
    ageGroup: AgeGroup.AGE_3_5,
    originConcept: 'Japanese Dexterity Game',
    occasion: GiftOccasion.BIRTHDAY,
    price: 399,
    compareAtPrice: 699,
    image: IMG_MOTOR,
    gallery: makeGallery(
      IMG_MOTOR,
      '28% 55%',
      IMG_MECHANISM,
      '22% 72%',
      IMG_SCALE,
      '40% 52%'
    ),
    variants: ['Sage & Ivory Tray', 'Coral & Mint Tray'],
    shortSpec: '3D-printed spring chopsticks · 18 faceted grip beads · Sorting tray',
    description:
      'Inspired by Japanese early-childhood Montessori chopstick drills, this custom 3D-printed spring trainer pairs ergonomic child finger loops with textured geometric beads and a precision sorting tray.',
    useCaseHi:
      'Children use the ergonomically designed 3D-printed spring chopsticks to pick up faceted geometric beads and sort them into matching recessed slots.',
    brainBenefitsHi:
      'Strengthens early pincer grasp and fine finger control between ages 3 and 5, making pencil grip and neat handwriting come naturally at school.',
    whyParentsBuyHi:
      'A calm, tactile challenge that keeps preschoolers happily absorbed for 45+ minutes during meals or quiet study time without asking for a phone.',
    materials: 'Child-Safe Matte Bio-PLA, Stainless Tension Micro-Spring',
    dimensions: 'Tray 18 cm × 14 cm · Chopsticks 16 cm',
    inStock: true,
    featured: true,
    tag: 'Handwriting Prep',
  },
  {
    id: 'bee4-dual-hand-brain-maze',
    title: 'Dual-Hand Asymmetric Left-Right Brain Maze',
    category: ProductCategory.MOTOR_SKILLS,
    ageGroup: AgeGroup.AGE_3_5,
    originConcept: 'Chinese Bilateral Trainer',
    occasion: GiftOccasion.EVERYDAY,
    price: 549,
    compareAtPrice: 949,
    image: IMG_SCALE,
    gallery: makeGallery(
      IMG_SCALE,
      '36% 48%',
      IMG_MECHANISM,
      '55% 75%',
      IMG_MOTOR,
      '50% 60%'
    ),
    variants: ['Indigo & Ivory', 'Forest & Amber'],
    shortSpec: 'Dual asymmetric tracks · Synchronized twin grip knobs · Non-slip base',
    description:
      'A classic bilateral cognitive training board engineered with contrasting geometric paths—one spiral curve and one stepped rectilinear labyrinth operated simultaneously with both hands.',
    useCaseHi:
      'Kids grip two knobs at once—guiding the left hand through a smooth circular curve while steering the right hand along a stepped square labyrinth.',
    brainBenefitsHi:
      'Between ages 3 and 5, neural connectivity develops rapidly; mirrored and asymmetric paths stimulate both left and right cerebral hemispheres together.',
    whyParentsBuyHi:
      'Trains balanced two-hand coordination and sustained attention in ways passive battery-powered toys simply cannot match.',
    materials: 'Smooth Chamfered Bio-PLA, Low-Friction Slider Pins',
    dimensions: '24 cm × 16 cm × 2.8 cm',
    inStock: true,
    featured: false,
    tag: 'Left+Right Brain',
  },
  {
    id: 'bee4-bian-lian-puppet',
    title: 'Bian Lian Instant Face-Changing Puppet',
    category: ProductCategory.IMAGINATION,
    ageGroup: AgeGroup.AGE_3_5,
    originConcept: 'Sichuan Opera Mechanism',
    occasion: GiftOccasion.BIRTHDAY,
    price: 449,
    compareAtPrice: 799,
    image: IMG_IMAGINATION,
    gallery: makeGallery(
      IMG_IMAGINATION,
      '26% 50%',
      IMG_MECHANISM,
      '70% 35%',
      IMG_SCALE,
      '45% 50%'
    ),
    variants: ['Opera Teal & Cream', 'Crimson & Ochre'],
    shortSpec: 'Spring-indexed 4-expression mask drum · Back thumb lever',
    description:
      'Adapted from centuries-old Sichuan Opera Bian Lian mask-changing mechanics into a compact, child-safe 3D-printed storyteller figurine with zero electronics or batteries.',
    useCaseHi:
      'Inspired by theatrical Bian Lian mask-switching craft, a press of the rear thumb lever snaps the figurine through happy, surprised, playful, and curious expressions.',
    brainBenefitsHi:
      'Builds early emotional vocabulary (EQ), narrative speech fluency, and facial-expression recognition during imaginative roleplay.',
    whyParentsBuyHi:
      'Turns passive cartoon watchers into confident young storytellers who act out emotions and scenes with their own hands.',
    materials: 'Rounded Kid-Safe Matte PLA, Tactile Cam Indexing Spring',
    dimensions: 'Height 14.5 cm × 9 cm',
    inStock: true,
    featured: true,
    tag: 'EQ & Storytelling',
  },
  {
    id: 'bee4-zoumadeng-shadow-lantern',
    title: 'Zoumadeng Rotating Shadow Carousel Lantern',
    category: ProductCategory.IMAGINATION,
    ageGroup: AgeGroup.AGE_3_5,
    originConcept: 'Optical Shadow Theater',
    occasion: GiftOccasion.FESTIVALS,
    price: 649,
    compareAtPrice: 1199,
    image: IMG_IMAGINATION,
    gallery: makeGallery(
      IMG_IMAGINATION,
      '68% 45%',
      IMG_MECHANISM,
      '50% 45%',
      IMG_SCALE,
      '55% 55%'
    ),
    variants: ['Peacock Teal Filigree', 'Warm Terracotta Filigree'],
    shortSpec: '360° rotating silhouette drum · Hand-cranked bevel gear',
    description:
      'A modern 3D-printed homage to Song-dynasty Zoumadeng shadow lanterns. Place a warm bedside torch inside the central hub and turn the crank to project moving animal silhouettes across bedroom walls.',
    useCaseHi:
      'Place a gentle bedside flashlight in the center hub and turn the hand-crank bevel gear to cast a 360-degree animated shadow panorama across room walls.',
    brainBenefitsHi:
      'Sparks visual imagination, intuitive understanding of light and shadow projection, and calm wind-down focus before sleep.',
    whyParentsBuyHi:
      'A gentle bedtime ritual that replaces bright evening tablets and phones with wonder-filled storytelling in a darkened room.',
    materials: 'Translucent & Matte Bio-PLA, Smooth Bevel Gear Base',
    dimensions: '15 cm × 13 cm Diameter',
    inStock: true,
    featured: false,
    tag: 'Bedtime Screen-Free',
  },

  // =========================================================================
  // AGE GROUP 2: 6–8 Years (Foundational Logic, Spatial IQ & Strategy)
  // =========================================================================
  {
    id: 'bee4-kumiki-animal-burr',
    title: 'Kumiki 3D Interlocking Animal Burr Puzzle',
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_6_8,
    originConcept: 'Japanese Kumiki Joinery',
    occasion: GiftOccasion.BIRTHDAY,
    price: 449,
    compareAtPrice: 799,
    image: IMG_ENGINEERING,
    gallery: makeGallery(
      IMG_ENGINEERING,
      '18% 60%',
      IMG_MECHANISM,
      '68% 65%',
      IMG_SCALE,
      '48% 55%'
    ),
    variants: ['Walnut Bear (12-Pc)', 'Charcoal Shiba (14-Pc)'],
    shortSpec: 'Zero-glue mortise-and-tenon key pin · 3D interlocking joinery',
    description:
      'Built on traditional Japanese Kumiki woodworking joints without a single drop of glue or magnet. Only sliding out the concealed key pin unlocks the entire sculpted animal.',
    useCaseHi:
      'Multiple sculpted blocks lock seamlessly via traditional mortise-and-tenon geometry; finding and sliding out the single key pin frees the entire sculpture.',
    brainBenefitsHi:
      'Introduces reverse engineering, 3D structural reasoning, and sequential dismantling-and-reassembly skills without screws or adhesives.',
    whyParentsBuyHi:
      'A genuine hands-on architectural puzzle that builds mechanical curiosity far deeper than disposable plastic figurines.',
    materials: 'Wood-Filled Matte PLA, Tight-Tolerance Sliding Key Pin',
    dimensions: '11 cm × 7.5 cm × 8 cm',
    inStock: true,
    featured: true,
    tag: 'Reverse Engineering',
  },
  {
    id: 'bee4-huarong-dao-slide-vault',
    title: 'Huarong Dao 3D Magnetic Slide Vault',
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_6_8,
    originConcept: 'Classical Sliding IQ Puzzle',
    occasion: GiftOccasion.DESK_COLLEGE,
    price: 549,
    compareAtPrice: 999,
    image: IMG_ENGINEERING,
    gallery: makeGallery(
      IMG_ENGINEERING,
      '82% 50%',
      IMG_MECHANISM,
      '75% 58%',
      IMG_SCALE,
      '35% 48%'
    ),
    variants: ['Sand & Walnut Edition', 'Slate & Amber Edition'],
    shortSpec: 'Embedded snap-click rails · 12 graded logic challenge cards',
    description:
      'The legendary sliding-block strategy puzzle rebuilt with crisp 3D-printed dovetail tracks and tactile magnetic detent feedback so tiles never pop out mid-solve.',
    useCaseHi:
      'Arrange tiles according to the challenge deck, then slide surrounding blocks smoothly along magnetic detent rails to release the primary key block.',
    brainBenefitsHi:
      'Develops algorithmic thinking, forward multi-step planning, and patient trial-and-error analysis core to mathematics.',
    whyParentsBuyHi:
      'Delivers the strategic depth of chess in a compact travel-ready board ideal for flights, road trips, and quiet evenings.',
    materials: 'Matte Bio-PLA, Recessed Neodymium Detent Magnets',
    dimensions: '16.5 cm × 16.5 cm × 2.2 cm',
    inStock: true,
    featured: true,
    tag: 'Chess-Like Strategy',
  },
  {
    id: 'bee4-chilgyo-3d-tangram',
    title: 'Chilgyo 3D Depth & Elevation Tangram',
    category: ProductCategory.MATHS_SCIENCE,
    ageGroup: AgeGroup.AGE_6_8,
    originConcept: 'Korean Spatial Tangram',
    occasion: GiftOccasion.EVERYDAY,
    price: 499,
    compareAtPrice: 899,
    image: IMG_MATHS,
    gallery: makeGallery(
      IMG_MATHS,
      '30% 48%',
      IMG_MECHANISM,
      '35% 50%',
      IMG_SCALE,
      '52% 52%'
    ),
    variants: ['Indigo & Terracotta PLA', 'Mustard & Ivory PLA'],
    shortSpec: 'Stepped Z-height polyhedron tiles · 60-pattern challenge booklet',
    description:
      'Unlike flat cardboard tangrams, Korean Chilgyo 3D Elevation tiles use varied block depths so children calculate angles, shadows, and multi-plane volume simultaneously.',
    useCaseHi:
      'Moving beyond flat 2D silhouettes, this Korean elevation tangram mixes stepped tile thicknesses so kids solve shapes across length, width, and height.',
    brainBenefitsHi:
      'Strengthens early school geometry, angular symmetry, area comparison, and 3D spatial IQ without rote textbook drills.',
    whyParentsBuyHi:
      'Makes complex geometry and architectural volume intuitive through 60 graded challenges from beginner to master level.',
    materials: 'Precision Matte Bio-PLA with Weighted Core Fill',
    dimensions: 'Base Tray 15 cm × 15 cm',
    inStock: true,
    featured: false,
    tag: 'Spatial IQ',
  },
  {
    id: 'bee4-kumi-ita-cards',
    title: 'Kumi-ita Slotted Architectural Builder Cards (40 Pcs)',
    category: ProductCategory.IMAGINATION,
    ageGroup: AgeGroup.AGE_6_8,
    originConcept: 'Japanese Modular Cards',
    occasion: GiftOccasion.HOUSEWARMING,
    price: 599,
    compareAtPrice: 999,
    image: IMG_IMAGINATION,
    gallery: makeGallery(
      IMG_IMAGINATION,
      '84% 72%',
      IMG_MECHANISM,
      '40% 60%',
      IMG_SCALE,
      '50% 50%'
    ),
    variants: ['Ivory & Terracotta 40-Set', 'Nordic Stone 40-Set'],
    shortSpec: '40 cross-slotted 2.4mm interlocking panels · Zero clips needed',
    description:
      'Japanese minimalist notched construction tiles precision-printed at 2.4 mm thickness so slots grip cleanly at 90-degree angles—allowing children to erect bridges, pagoda roofs, and geometric towers.',
    useCaseHi:
      'Forty cross-notched cards slide effortlessly into perpendicular joints—letting children invent sturdy bridges, towers, and spacecraft without clips or magnets.',
    brainBenefitsHi:
      'Nurtures structural engineering instincts, center-of-mass balance, and open-ended 3D spatial creativity.',
    whyParentsBuyHi:
      'Unlike repetitive snap-bricks, minimalist notched cards invite unlimited open-ended architecture that grows with your child.',
    materials: 'High-Stiffness Matte Bio-PLA, Chamfered Grip Slots',
    dimensions: 'Card 5.5 cm × 5.5 cm × 2.4 mm (Pack of 40)',
    inStock: true,
    featured: false,
    tag: '40-Pc Builder',
  },

  // =========================================================================
  // AGE GROUP 3: 9–11 Years (Deep Focus, Deduction & Applied Geometry)
  // =========================================================================
  {
    id: 'bee4-karakuri-trick-box',
    title: 'Karakuri Secret 5-Step Trick Box',
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_9_11,
    originConcept: 'Japanese Karakuri',
    occasion: GiftOccasion.FESTIVALS,
    price: 699,
    compareAtPrice: 1299,
    image: IMG_ENGINEERING,
    gallery: makeGallery(
      IMG_ENGINEERING,
      '48% 58%',
      IMG_MECHANISM,
      '52% 68%',
      IMG_SCALE,
      '45% 50%'
    ),
    variants: ['Obsidian Slate PLA', 'Hakone Walnut PLA'],
    shortSpec: '5 hidden sequential sliding locks · Concealed treasure compartment',
    description:
      'Inspired by Hakone’s legendary Karakuri secret boxes. All five interlocking faces must be shifted in exact sequence using hidden internal channels before the vault lid slides free.',
    useCaseHi:
      'Every wooden-finish panel conceals internal sliding tracks—players must deduce the exact 5-step sequence of shifts to release the secret compartment.',
    brainBenefitsHi:
      'Sharpens deductive reasoning, cause-and-effect observation, working memory, and deep focused persistence for ages 9 to 11.',
    whyParentsBuyHi:
      'Doubles as both a rewarding mechanical brain-teaser and a secret keepsake vault kids love challenging their friends to open.',
    materials: 'Precision Interlocking Matte PLA with Internal Tracks',
    dimensions: '11.5 cm × 8.5 cm × 6.5 cm',
    inStock: true,
    featured: true,
    tag: 'Hakone Secret',
  },
  {
    id: 'bee4-korean-soma-cube',
    title: "Korean 'Gabe' Soma Cube 240-Challenge Vault",
    category: ProductCategory.MATHS_SCIENCE,
    ageGroup: AgeGroup.AGE_9_11,
    originConcept: 'Korean Gabe Polycube',
    occasion: GiftOccasion.DESK_COLLEGE,
    price: 399,
    compareAtPrice: 699,
    image: IMG_MATHS,
    gallery: makeGallery(
      IMG_MATHS,
      '72% 48%',
      IMG_MECHANISM,
      '42% 45%',
      IMG_SCALE,
      '48% 52%'
    ),
    variants: ['Bauhaus Multi-Tone', 'Monochrome Stone'],
    shortSpec: '7 asymmetric polycubes · 240 valid 3×3×3 cube solutions',
    description:
      'A staple in Korean gifted-math academies: seven distinct multi-cubic components that assemble into 240 mathematically valid cubes plus sculptural bridges and pyramids.',
    useCaseHi:
      'Combine 7 distinct asymmetric polycube blocks into a crisp 3×3×3 cube—across 240 mathematically unique solutions—or sculpt stepped pyramids and arches.',
    brainBenefitsHi:
      'Widely used in East-Asian math enrichment clubs to master 3D volume visualization, rotational symmetry, and combinatorial thinking.',
    whyParentsBuyHi:
      'An ultra-compact, affordable study-desk companion that builds Olympiad-grade spatial reasoning away from screens.',
    materials: 'Precision Weight-Balanced Matte Bio-PLA',
    dimensions: 'Assembled Cube 7.5 cm × 7.5 cm × 7.5 cm',
    inStock: true,
    featured: true,
    tag: 'Olympiad Math Prep',
  },
  {
    id: 'bee4-geometric-kendama-pro',
    title: 'Modern Geometric Kendama Focus Pro',
    category: ProductCategory.MOTOR_SKILLS,
    ageGroup: AgeGroup.AGE_9_11,
    originConcept: 'Japanese Focus Kendama',
    occasion: GiftOccasion.EVERYDAY,
    price: 499,
    compareAtPrice: 849,
    image: IMG_MOTOR,
    gallery: makeGallery(
      IMG_MOTOR,
      '82% 48%',
      IMG_MECHANISM,
      '65% 40%',
      IMG_SCALE,
      '42% 55%'
    ),
    variants: ['Terracotta & Sage Ball', 'Cobalt & Bone Ball'],
    shortSpec: 'Weighted faceted cups · Tactile matte-grip sphere · Braided cord',
    description:
      'A contemporary 3D-printed reimagining of Japan’s traditional Kendama focus sport, featuring micro-faceted catch cups tuned for optimal friction and clean hand-eye calibration.',
    useCaseHi:
      'Swing and land the tethered matte sphere cleanly into faceted big, small, and base cups—graduating from foundational catches to flowing trick combos.',
    brainBenefitsHi:
      'Refines dynamic hand-eye coordination, micro-reflex timing, posture balance, and mindful reset focus for active pre-teens.',
    whyParentsBuyHi:
      'Gets 9–11 year olds off the sofa and away from endless video feeds with an active skill toy they love mastering.',
    materials: 'High-Infill Impact-Tough PLA+, Braided Nylon Cord',
    dimensions: 'Height 17 cm · Sphere 5.6 cm',
    inStock: true,
    featured: false,
    tag: 'Hand-Eye Focus',
  },
  {
    id: 'bee4-gyro-pagoda-tower',
    title: 'Gyroscopic Pagoda Finger-Balance Tower',
    category: ProductCategory.MOTOR_SKILLS,
    ageGroup: AgeGroup.AGE_9_11,
    originConcept: 'Zen Physics Balance',
    occasion: GiftOccasion.DESK_COLLEGE,
    price: 349,
    compareAtPrice: 599,
    image: HERO_IMAGE,
    gallery: makeGallery(
      HERO_IMAGE,
      '60% 52%',
      IMG_MECHANISM,
      '45% 48%',
      IMG_SCALE,
      '35% 50%'
    ),
    variants: ['Bamboo Bone & Ink', 'Amber Gold & Charcoal'],
    shortSpec: 'Counter-weighted pagoda rings · Pivot cone finger stand',
    description:
      'A pocket-sized Zen counter-balance tower whose concentric pagoda discs shift center of gravity mid-spin, turning tabletop gravity physics into a meditative dexterity challenge.',
    useCaseHi:
      'Stack the counter-weighted pagoda rings onto the precision pivot cone and balance the entire kinetic sculpture steadily on one fingertip or pencil tip.',
    brainBenefitsHi:
      'Demonstrates center of gravity, angular equilibrium, and calm somatic breathing control before homework or exams.',
    whyParentsBuyHi:
      'A five-minute pre-study desk reset that quiets fidgety hands and primes memory retention naturally.',
    materials: 'Weighted Brass-Insert Base Cone, Layered Bio-PLA',
    dimensions: 'Height 11 cm × 7 cm Base Span',
    inStock: true,
    featured: false,
    tag: 'Under ₹350 · Zen Focus',
  },

  // =========================================================================
  // AGE GROUP 4: 12–15 Years (Mechanical Computing, Golden Ratio & Robotics)
  // =========================================================================
  {
    id: 'bee4-open-gear-automaton',
    title: 'Open-Gear Hand-Cranked Automaton Kit',
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_12_15,
    originConcept: 'Kinetic Gear Engineering',
    occasion: GiftOccasion.BIRTHDAY,
    price: 799,
    compareAtPrice: 1499,
    image: IMG_BINARY_STEM,
    gallery: makeGallery(
      IMG_BINARY_STEM,
      '70% 45%',
      IMG_MECHANISM,
      '50% 48%',
      HERO_IMAGE,
      '58% 50%'
    ),
    variants: ['Cobalt & Amber Gears', 'Woodtone Natural PLA'],
    shortSpec: 'DIY spur gears & cam linkages · Wings flap smoothly on crank turn',
    description:
      'Inspired by Japanese Karakuri ningyo automata, teens assemble meshing spur gears, eccentric cams, and articulated wing linkages to convert rotary hand-crank motion into graceful flapping flight.',
    useCaseHi:
      'Assemble meshing involute spur gears, steel axles, and eccentric cam linkages—then turn the hand crank to animate smooth undulating wing motion.',
    brainBenefitsHi:
      'Makes mechanical engineering tangible through real-world gear ratios, torque transfer, cam timing, and motion conversion.',
    whyParentsBuyHi:
      'Instead of memorizing textbook kinematics diagrams, teens build a functioning kinetic sculpture with their own hands.',
    materials: 'Precision Involute-Tooth Bio-PLA, Steel Dowel Axles',
    dimensions: 'Assembled Height 22 cm × 16 cm',
    inStock: true,
    featured: true,
    tag: 'DIY Mechanics Kit',
  },
  {
    id: 'bee4-binary-marble-computer',
    title: 'Mechanical Binary Marble Computer Board',
    category: ProductCategory.MATHS_SCIENCE,
    ageGroup: AgeGroup.AGE_12_15,
    originConcept: 'STEM Binary Logic Board',
    occasion: GiftOccasion.DESK_COLLEGE,
    price: 899,
    compareAtPrice: 1599,
    image: IMG_BINARY_STEM,
    gallery: makeGallery(
      IMG_BINARY_STEM,
      '26% 52%',
      IMG_MECHANISM,
      '58% 72%',
      IMG_SCALE,
      '40% 50%'
    ),
    variants: ['Graphite & Amber Gates', 'Cobalt & Bone Gates'],
    shortSpec: '6 mechanical flip-flop rockers · Steel marbles compute 0 & 1 binary',
    description:
      'A mesmerizing mechanical digital computer powered solely by gravity and steel marbles. Drop marbles down angled channels to flip bit rockers and add binary numbers physically right on your desk.',
    useCaseHi:
      'Drop precision steel marbles down gravity-fed channels to trigger mechanical flip-flop rockers that store bits (0 and 1) and physically add binary values.',
    brainBenefitsHi:
      'Cements core computer science fundamentals—binary representation, boolean logic gates, carry-over overflow, and sequential state.',
    whyParentsBuyHi:
      'One of the clearest screen-free ways for budding coders to see and hear how computers think inside.',
    materials: 'Rigid Matte PLA Frame, 12 Precision Steel Marbles',
    dimensions: '26 cm × 21 cm × 9 cm Stand',
    inStock: true,
    featured: true,
    tag: 'Flagship STEM Computer',
  },
  {
    id: 'bee4-fibonacci-caliper',
    title: 'Fibonacci Golden Ratio Nature Caliper',
    category: ProductCategory.MATHS_SCIENCE,
    ageGroup: AgeGroup.AGE_12_15,
    originConcept: 'Korean Mathematical Tool',
    occasion: GiftOccasion.EVERYDAY,
    price: 349,
    compareAtPrice: 599,
    image: IMG_BINARY_STEM,
    gallery: makeGallery(
      IMG_BINARY_STEM,
      '88% 58%',
      IMG_MECHANISM,
      '75% 32%',
      IMG_SCALE,
      '48% 55%'
    ),
    variants: ['Cobalt Studio Finish', 'Brass-Tone PLA Finish'],
    shortSpec: 'Fixed 1 : 1.618 pantograph pivot · Measure leaves, sketches & frames',
    description:
      'A pocket-sized articulated pantograph caliper geometrically locked to the Golden Ratio (Phi = 1.618). Open or close the blades to measure natural proportions in leaves, architecture, and artwork.',
    useCaseHi:
      'Extend or close the brass-pivoted pantograph arms—whose center blade automatically stays locked at a 1 : 1.618 ratio—to inspect leaves, sketches, and layouts.',
    brainBenefitsHi:
      'Awakens genuine wonder for mathematical ratios, Fibonacci sequences in nature, and balanced visual composition.',
    whyParentsBuyHi:
      'A sleek, pocketable design instrument loved equally by young artists, budding architects, and science enthusiasts.',
    materials: 'High-Stiffness Matte Bio-PLA, Brass Friction Pivot Pins',
    dimensions: 'Length 18 cm × 8 cm (Folded)',
    inStock: true,
    featured: false,
    tag: 'Under ₹350 · Golden Ratio',
  },
  {
    id: 'bee4-strandbeest-walker-kit',
    title: 'Strandbeest Wind-Powered Walking Creature Kit',
    category: ProductCategory.IMAGINATION,
    ageGroup: AgeGroup.AGE_12_15,
    originConcept: 'Jansen Linkage Robotics',
    occasion: GiftOccasion.BIRTHDAY,
    price: 849,
    compareAtPrice: 1499,
    image: HERO_IMAGE,
    gallery: makeGallery(
      HERO_IMAGE,
      '84% 52%',
      IMG_MECHANISM,
      '32% 62%',
      IMG_SCALE,
      '50% 50%'
    ),
    variants: ['Ivory & Woodtone Linkage', 'Graphite Robotics Kit'],
    shortSpec: 'Jansen 8-leg walking linkage · Snap-fit propeller turbine',
    description:
      'Precision-printed miniature Jansen linkage walking sculpture made famous across Japanese science workshops. Assemble the crankshaft, attach the turbine propeller, and blow gently or set it before a fan to watch it stride smoothly across the floor.',
    useCaseHi:
      'Build the multi-crank 8-leg walking linkage and snap on the turbine propeller—then let a desk fan or gentle breeze power its organic striding gait with zero batteries.',
    brainBenefitsHi:
      'Unlocks practical understanding of planar linkage kinematics, harmonic crank phase timing, and renewable wind propulsion.',
    whyParentsBuyHi:
      'Inspires teens fascinated by robotics and engineering to step off mobile games and assemble a mesmerizing walking machine.',
    materials: 'Self-Lubricating Matte PLA+, Snap-Fit Propeller Rotor',
    dimensions: '21 cm × 15 cm × 14 cm',
    inStock: true,
    featured: true,
    tag: 'Wind-Powered Robotics',
  },
];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const INITIAL_ORDERS = [
  {
    orderNumber: 'BEE4-2042',
    createdAt: '2026-11-15T16:10:00.000Z',
    items: [
      {
        productId: 'bee4-strandbeest-walker-kit',
        title: 'Strandbeest Wind-Powered Walking Creature Kit',
        price: 849,
        image: HERO_IMAGE,
        variant: 'Ivory & Woodtone Linkage',
        quantity: 1,
        category: ProductCategory.IMAGINATION,
      },
      {
        productId: 'bee4-fibonacci-caliper',
        title: 'Fibonacci Golden Ratio Nature Caliper',
        price: 349,
        image: IMG_BINARY_STEM,
        variant: 'Cobalt Studio Finish',
        quantity: 1,
        category: ProductCategory.MATHS_SCIENCE,
      },
    ],
    subtotal: 1198,
    discount: 180,
    shippingFee: 0,
    giftWrapFee: 49,
    codFee: 0,
    total: 1067,
    paymentMethod: 'upi' as const,
    orderChannel: 'UPI / Prepaid' as const,
    couponCode: 'SMARTKID15',
    customer: {
      fullName: 'Priya Sinha',
      phone: '9431223344',
      email: 'priya.sinha@example.com',
      address: '204 Boring Road Crossing, Sri Krishna Puri',
      city: 'Patna',
      state: 'Bihar',
      pinCode: '800001',
    },
    giftWrap: true,
    giftMessage: 'Happy 13th Birthday Aarav — build something brilliant!',
    status: 'Confirmed' as const,
    fulfillmentStage: 'New / Unverified' as const,
    courierPartner: '',
    awbNumber: '',
    trackingUrl: '',
    internalNotes: 'Intra-state Bihar dispatch; prioritize morning Banka courier pickup.',
  },
  {
    orderNumber: 'BEE4-2041',
    createdAt: '2026-11-14T14:20:00.000Z',
    items: [
      {
        productId: 'bee4-binary-marble-computer',
        title: 'Mechanical Binary Marble Computer Board',
        price: 899,
        image: IMG_BINARY_STEM,
        variant: 'Graphite & Amber Gates',
        quantity: 1,
        category: ProductCategory.MATHS_SCIENCE,
      },
    ],
    subtotal: 899,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 49,
    codFee: 0,
    total: 948,
    paymentMethod: 'upi' as const,
    orderChannel: 'UPI / Prepaid' as const,
    couponCode: '',
    customer: {
      fullName: 'Ananya Verma',
      phone: '9820112233',
      email: 'ananya.v@example.com',
      address: '14 Bandra West, Pali Hill',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400050',
    },
    giftWrap: true,
    giftMessage: 'Zero screen-time birthday gift — enjoy building!',
    status: 'Preparing Shipment' as const,
    fulfillmentStage: 'Printing / Packing' as const,
    courierPartner: 'Delhivery',
    awbNumber: 'DLV490128734',
    trackingUrl: 'https://www.delhivery.com/track/package/DLV490128734',
    internalNotes: 'Include 12 steel marbles verification checklist.',
  },
  {
    orderNumber: 'BEE4-2040',
    createdAt: '2026-11-13T11:05:00.000Z',
    items: [
      {
        productId: 'bee4-karakuri-trick-box',
        title: 'Karakuri Secret 5-Step Trick Box',
        price: 699,
        image: IMG_ENGINEERING,
        variant: 'Obsidian Slate PLA',
        quantity: 1,
        category: ProductCategory.ENGINEERING,
      },
      {
        productId: 'bee4-mame-tsukami-chopsticks',
        title: 'Mame-Tsukami Spring Chopstick Precision Game',
        price: 399,
        image: IMG_MOTOR,
        variant: 'Sage & Ivory Tray',
        quantity: 1,
        category: ProductCategory.MOTOR_SKILLS,
      },
    ],
    subtotal: 1098,
    discount: 110,
    shippingFee: 0,
    giftWrapFee: 0,
    codFee: 29,
    total: 1017,
    paymentMethod: 'cod' as const,
    orderChannel: 'COD' as const,
    couponCode: 'BEE4WELCOME',
    customer: {
      fullName: 'Rohan Malhotra',
      phone: '9811445566',
      email: 'rohan.m@example.com',
      address: 'C-28 Hauz Khas Enclave',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110016',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Shipped' as const,
    fulfillmentStage: 'Shipped' as const,
    courierPartner: 'BlueDart',
    awbNumber: 'BD772910384',
    trackingUrl: 'https://www.bluedart.com/tracking?awb=BD772910384',
    internalNotes: 'COD verified over WhatsApp.',
  },
  {
    orderNumber: 'BEE4-2039',
    createdAt: '2026-11-11T09:40:00.000Z',
    items: [
      {
        productId: 'bee4-kumiki-animal-burr',
        title: 'Kumiki 3D Interlocking Animal Burr Puzzle',
        price: 449,
        image: IMG_ENGINEERING,
        variant: 'Walnut Bear (12-Pc)',
        quantity: 1,
        category: ProductCategory.ENGINEERING,
      },
    ],
    subtotal: 449,
    discount: 0,
    shippingFee: 49,
    giftWrapFee: 0,
    codFee: 0,
    total: 498,
    paymentMethod: 'card' as const,
    orderChannel: 'UPI / Prepaid' as const,
    couponCode: '',
    customer: {
      fullName: 'Meera Nair',
      phone: '9900223344',
      email: 'meera.nair@example.com',
      address: '21 Koramangala 4th Block',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560034',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Delivered' as const,
    fulfillmentStage: 'Delivered' as const,
    courierPartner: 'Shiprocket',
    awbNumber: 'SR883920145',
    trackingUrl: 'https://shiprocket.co/tracking/SR883920145',
    internalNotes: 'Teacher classroom sample delivered.',
  },
];

export const INITIAL_INQUIRIES = [
  {
    id: 'inq-1',
    createdAt: '2026-11-14T10:15:00.000Z',
    name: 'Siddharth Joshi',
    contact: '9845011223',
    topic: 'Bulk / Festival Gifting',
    message:
      'Looking for 30 Soma Cube & Kumiki brain-training kits under ₹499 each for our school STEM fest.',
    status: 'New' as const,
  },
];

export const DEFAULT_STORE_SETTINGS = {
  whatsappNumber: '919800004004',
  supportEmail: 'hello@bee4.in',
  announcementText:
    'East-Asian Screen-Free 3D-Printed Brain Toys (₹349–₹899) · Use code SMARTKID15 for 15% Off',
  announcementEnabled: true,
  heroHeadline: 'Screen-Free Brain Toys for Deep Focus.',
  heroSubheadline: 'Small-batch 3D-printed Japanese, Korean & Chinese puzzles starting at ₹99.',
  heroCtaText: 'Explore 16 Brain Toys',
  featuredBannerEnabled: true,
  visibleCategories: [
    'Brain-Training Toys',
    '3D Home Decor',
    'Stainless Steel Flasks',
    'Lifestyle Gear',
  ] as ('Brain-Training Toys' | '3D Home Decor' | 'Stainless Steel Flasks' | 'Lifestyle Gear')[],
  freeShippingThreshold: 499,
  standardShippingFee: 49,
  codHandlingFee: 0,
  giftWrapFee: 49,
  giftWrapEnabled: true,
  upiEnabled: true,
  codEnabled: true,
  whatsappOrderEnabled: true,
  upiVpa: 'bee4studio@okaxis',
  promoCode: 'SMARTKID15',
  promoDiscountPercent: 15,
  giftFinderWeights: {
    [GiftOccasion.BIRTHDAY]: 10,
    [GiftOccasion.FESTIVALS]: 8,
    [GiftOccasion.DESK_COLLEGE]: 7,
    [GiftOccasion.EVERYDAY]: 6,
    [GiftOccasion.HOUSEWARMING]: 5,
  },
};

export const INITIAL_COUPONS = [
  {
    id: 'cpn-smartkid15',
    code: 'SMARTKID15',
    description: '15% Off on all Screen-Free Brain-Training Toys',
    discountType: 'percentage' as const,
    value: 15,
    minOrderValue: 349,
    prepaidOnly: false,
    usageLimit: 500,
    usedCount: 38,
    expiresAt: '2027-03-31',
    active: true,
  },
  {
    id: 'cpn-bee4welcome',
    code: 'BEE4WELCOME',
    description: '10% Welcome Discount on your first BEE4 order',
    discountType: 'percentage' as const,
    value: 10,
    minOrderValue: 299,
    prepaidOnly: false,
    usageLimit: 1000,
    usedCount: 142,
    expiresAt: '2027-03-31',
    active: true,
  },
  {
    id: 'cpn-prepaid50',
    code: 'PREPAID50',
    description: 'Flat ₹50 Off on UPI & Card Prepaid orders ₹599+',
    discountType: 'flat' as const,
    value: 50,
    minOrderValue: 599,
    prepaidOnly: true,
    usageLimit: 300,
    usedCount: 24,
    expiresAt: '2027-02-28',
    active: true,
  },
];

export const INITIAL_FILAMENT_SPOOLS = [
  {
    id: 'spool-bio-pla-ivory',
    name: 'eSUN Bio-PLA+ Silk Ivory',
    material: 'Matte Bio-PLA+' as const,
    colorHex: '#f5efe6',
    colorName: 'Matte Ivory',
    remainingGrams: 1850,
    capacityGrams: 2000,
    costPerKg: 1180,
    gramsPerToyAvg: 115,
  },
  {
    id: 'spool-eco-pla-amber',
    name: 'Bambu Eco-PLA Warm Amber',
    material: 'Eco-PLA' as const,
    colorHex: '#d97706',
    colorName: 'Warm Amber',
    remainingGrams: 410,
    capacityGrams: 1000,
    costPerKg: 1350,
    gramsPerToyAvg: 95,
  },
  {
    id: 'spool-bio-pla-obsidian',
    name: 'Polylite Bio-PLA+ Obsidian',
    material: 'Matte Bio-PLA+' as const,
    colorHex: '#27272a',
    colorName: 'Obsidian Slate',
    remainingGrams: 760,
    capacityGrams: 1000,
    costPerKg: 1290,
    gramsPerToyAvg: 125,
  },
  {
    id: 'spool-wood-pla-walnut',
    name: 'Wood-Filled PLA+ Hakone Walnut',
    material: 'Eco-PLA' as const,
    colorHex: '#78350f',
    colorName: 'Hakone Walnut',
    remainingGrams: 240,
    capacityGrams: 1000,
    costPerKg: 1620,
    gramsPerToyAvg: 140,
  },
];

export const INITIAL_PRINT_JOBS = [
  {
    id: 'job-101',
    productId: 'bee4-strandbeest-walker-kit',
    productTitle: 'Strandbeest Wind-Powered Walking Creature Kit',
    orderNumber: 'BEE4-2042',
    batchQty: 4,
    material: 'eSUN Bio-PLA+ Silk Ivory',
    estimatedGrams: 640,
    stage: 'Printing' as const,
    printerName: 'Bambu A1 Mini #1 (Banka Lab)',
    updatedAt: '2026-11-15T16:30:00.000Z',
  },
  {
    id: 'job-102',
    productId: 'bee4-binary-marble-computer',
    productTitle: 'Mechanical Binary Marble Computer Board',
    orderNumber: 'BEE4-2041',
    batchQty: 3,
    material: 'Polylite Bio-PLA+ Obsidian',
    estimatedGrams: 720,
    stage: 'Quality Check' as const,
    printerName: 'Bambu P1S #2 (Banka Lab)',
    updatedAt: '2026-11-15T12:15:00.000Z',
  },
  {
    id: 'job-103',
    productId: 'bee4-karakuri-trick-box',
    productTitle: 'Karakuri Secret 5-Step Trick Box',
    batchQty: 6,
    material: 'Wood-Filled PLA+ Hakone Walnut',
    estimatedGrams: 840,
    stage: 'Queued' as const,
    printerName: 'Bambu P1S #3 (Banka Lab)',
    updatedAt: '2026-11-15T10:00:00.000Z',
  },
];

export const INITIAL_ADMIN_LOGS = [
  {
    id: 'log-1',
    timestamp: '2026-11-15T16:35:00.000Z',
    adminEmail: 'ranjitbgm@gmail.com',
    action: 'COUPON_SYNCED',
    entityType: 'coupon' as const,
    entityId: 'SMARTKID15',
    summary: 'Activated SMARTKID15 (15% Off) storefront promo campaign.',
  },
  {
    id: 'log-2',
    timestamp: '2026-11-14T15:00:00.000Z',
    adminEmail: 'ranjitbgm@gmail.com',
    action: 'ORDER_COURIER_ASSIGNED',
    entityType: 'order' as const,
    entityId: 'BEE4-2041',
    summary: 'Assigned Delhivery AWB DLV490128734 and moved to Printing / Packing.',
  },
];

export const INITIAL_TESTIMONIALS = [
  {
    id: 'test-1',
    customerName: 'Ananya Verma',
    cityOrRole: 'Mother of 12-yr-old · Mumbai',
    productName: 'Mechanical Binary Marble Computer Board',
    rating: 5 as const,
    feedback:
      'My son spent two straight evenings testing binary addition with steel marbles instead of touching his tablet. Print tolerances from the studio are razor-sharp.',
    createdAt: '2026-11-10T09:30:00.000Z',
  },
  {
    id: 'test-2',
    customerName: 'Rohan Malhotra',
    cityOrRole: 'Father of 4-yr-old · New Delhi',
    productName: 'Mame-Tsukami Spring Chopstick Precision Game',
    rating: 5 as const,
    feedback:
      'Bought both the Mame-Tsukami game for my younger daughter and the Karakuri 5-Step box for her elder brother. Keeps dinner & study time completely screen-free!',
    createdAt: '2026-11-06T16:15:00.000Z',
  },
  {
    id: 'test-3',
    customerName: 'Meera Nair',
    cityOrRole: 'Primary Educator · Bengaluru',
    productName: "Korean 'Gabe' Soma Cube 240-Challenge Vault",
    rating: 5 as const,
    feedback:
      'We keep two sets of Korean Soma Cubes and Chilgyo 3D Tangrams in class. Kids grasp spatial volume and symmetry in minutes.',
    createdAt: '2026-11-02T12:00:00.000Z',
  },
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-ananya',
    fullName: 'Ananya Verma',
    phone: '9820112233',
    email: 'ananya.v@example.com',
    passwordHash: 'f0ec6c416a429482c1e326183df502f582cd19464cef58da4da4ca146c189dda',
    preferredPayment: 'upi' as const,
    celebrationMonth: 'October',
    crmFlag: 'VIP' as const,
    createdAt: '2026-10-18T10:00:00.000Z',
    addresses: [
      {
        id: 'addr-1',
        label: 'Home' as const,
        fullName: 'Ananya Verma',
        phone: '9820112233',
        address: '14 Bandra West, Pali Hill',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400050',
        isDefault: true,
      },
      {
        id: 'addr-2',
        label: 'Work' as const,
        fullName: 'Ananya Verma',
        phone: '9820112233',
        address: 'Floor 6, One BKC Studio, Bandra East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        isDefault: false,
      },
    ],
    wishlistIds: ['bee4-karakuri-trick-box', 'bee4-binary-marble-computer'],
  },
  {
    id: 'cust-rohan',
    fullName: 'Rohan Malhotra',
    phone: '9811445566',
    email: 'rohan.m@example.com',
    passwordHash: 'afc603767d10384e154581e81ffb87b155779152de40646a6ab8532f5717f3c5',
    preferredPayment: 'cod' as const,
    celebrationMonth: 'March',
    crmFlag: 'Standard' as const,
    createdAt: '2026-10-25T15:20:00.000Z',
    addresses: [
      {
        id: 'addr-3',
        label: 'Home' as const,
        fullName: 'Rohan Malhotra',
        phone: '9811445566',
        address: 'C-28 Hauz Khas Enclave',
        city: 'New Delhi',
        state: 'Delhi',
        pinCode: '110016',
        isDefault: true,
      },
    ],
    wishlistIds: ['bee4-korean-soma-cube'],
  },
];

const SEED_STOCK_OVERRIDES: Record<string, number> = {
  'bee4-strandbeest-walker-kit': 2,
  'bee4-karakuri-trick-box': 3,
  'bee4-binary-marble-computer': 4,
  'bee4-huarong-dao-slide-vault': 5,
};

export function hydrateProductAdminFields(product: Product, index = 0): Product {
  const defaultSku = `BEE4-${String(101 + index).padStart(3, '0')}`;
  const defaultStock = SEED_STOCK_OVERRIDES[product.id] ?? (product.inStock ? 14 : 0);
  const defaultCost = Math.round(product.price * 0.34);

  return {
    ...product,
    sku: product.sku || defaultSku,
    slug: product.slug || product.id,
    primaryCategory: product.primaryCategory || 'Brain-Training Toys',
    skills: product.skills && product.skills.length > 0 ? product.skills : [product.category],
    ageGroups: product.ageGroups && product.ageGroups.length > 0 ? product.ageGroups : [product.ageGroup],
    manufacturingCost:
      typeof product.manufacturingCost === 'number' ? product.manufacturingCost : defaultCost,
    careInstruction: product.careInstruction || 'Keep away from heat above 55°C (Eco-PLA)',
    weightGrams: product.weightGrams || 180,
    hsnCode: product.hsnCode || '3926',
    stockQuantity:
      typeof product.stockQuantity === 'number' ? product.stockQuantity : defaultStock,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    giftable: product.giftable ?? true,
    madeToOrder: product.madeToOrder ?? false,
    damagedScrapCount: product.damagedScrapCount ?? 0,
    status: product.status || 'Active',
  };
}

export const INITIAL_DEMO_RETURN_ORDERS = [
  {
    orderNumber: 'BEE4-2044',
    createdAt: '2026-11-14T11:30:00.000Z',
    items: [
      {
        productId: 'bee4-karakuri-trick-box',
        title: 'Karakuri Secret 5-Step Trick Box',
        price: 699,
        image: IMG_ENGINEERING,
        variant: 'Obsidian Slate PLA',
        quantity: 1,
        category: ProductCategory.ENGINEERING,
      },
    ],
    subtotal: 699,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    codFee: 0,
    total: 699,
    paymentMethod: 'cod' as const,
    orderChannel: 'COD' as const,
    couponCode: '',
    customer: {
      fullName: 'Vikram Seth',
      phone: '9830556677',
      email: 'vikram.seth@example.com',
      address: '42 Park Street, Ballygunge',
      city: 'Kolkata',
      state: 'West Bengal',
      pinCode: '700016',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Delivered' as const,
    fulfillmentStage: 'Delivered' as const,
    courierPartner: 'Delhivery',
    awbNumber: 'DLV592014400',
    trackingUrl: 'https://www.delhivery.com/track/package/DLV592014400',
    internalNotes: 'Delivered within 7-day RMA window; eligible for customer return demo.',
  },
  {
    orderNumber: 'BEE4-2038',
    createdAt: '2026-11-13T10:15:00.000Z',
    items: [
      {
        productId: 'bee4-binary-marble-computer',
        title: 'Mechanical Binary Marble Computer Board',
        price: 899,
        image: IMG_BINARY_STEM,
        variant: 'Graphite & Amber Gates',
        quantity: 1,
        category: ProductCategory.MATHS_SCIENCE,
      },
    ],
    subtotal: 899,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    codFee: 0,
    total: 899,
    paymentMethod: 'upi' as const,
    orderChannel: 'UPI / Prepaid' as const,
    couponCode: '',
    customer: {
      fullName: 'Kavita Reddy',
      phone: '9701223344',
      email: 'kavita.r@example.com',
      address: '19 Jubilee Hills Road No. 36',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500033',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Delivered' as const,
    fulfillmentStage: 'Delivered' as const,
    courierPartner: 'BlueDart',
    awbNumber: 'BD660129384',
    trackingUrl: 'https://www.bluedart.com/tracking?awb=BD660129384',
    internalNotes: 'Customer reported transit crack on gate lever.',
  },
  {
    orderNumber: 'BEE4-2037',
    createdAt: '2026-11-12T15:00:00.000Z',
    items: [
      {
        productId: 'bee4-strandbeest-walker-kit',
        title: 'Strandbeest Wind-Powered Walking Creature Kit',
        price: 849,
        image: HERO_IMAGE,
        variant: 'Ivory & Woodtone Linkage',
        quantity: 1,
        category: ProductCategory.IMAGINATION,
      },
    ],
    subtotal: 849,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    codFee: 0,
    total: 849,
    paymentMethod: 'cod' as const,
    orderChannel: 'COD' as const,
    couponCode: '',
    customer: {
      fullName: 'Arjun Kulkarni',
      phone: '9822334455',
      email: 'arjun.k@example.com',
      address: '84 Koregaon Park Lane 6',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Delivered' as const,
    fulfillmentStage: 'Delivered' as const,
    courierPartner: 'Shiprocket',
    awbNumber: 'SR774920112',
    trackingUrl: 'https://shiprocket.co/tracking/SR774920112',
    internalNotes: 'Free Instant Replacement approved; reverse pickup in transit.',
  },
  {
    orderNumber: 'BEE4-2036',
    createdAt: '2026-11-10T12:45:00.000Z',
    items: [
      {
        productId: 'bee4-huarong-dao-slide-vault',
        title: 'Huarong Dao Three-Kingdoms 3D Slide Vault',
        price: 499,
        image: IMG_MATHS,
        variant: 'Amber & Slate Tiles',
        quantity: 1,
        category: ProductCategory.MATHS_SCIENCE,
      },
    ],
    subtotal: 499,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    codFee: 0,
    total: 499,
    paymentMethod: 'upi' as const,
    orderChannel: 'UPI / Prepaid' as const,
    couponCode: '',
    customer: {
      fullName: 'Neha Gupta',
      phone: '9818001122',
      email: 'neha.g@example.com',
      address: '15 C-Scheme Ashok Marg',
      city: 'Jaipur',
      state: 'Rajasthan',
      pinCode: '302001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Delivered' as const,
    fulfillmentStage: 'Delivered' as const,
    courierPartner: 'Delhivery',
    awbNumber: 'DLV384019283',
    trackingUrl: 'https://www.delhivery.com/track/package/DLV384019283',
    internalNotes: 'Returned unopened box in perfect QC condition; restocked.',
    refundStatus: 'Refunded' as const,
    refundedAmount: 499,
  },
];

export const INITIAL_RETURNS = [
  {
    id: 'rma-1041',
    rmaNumber: 'RMA-1041',
    orderNumber: 'BEE4-2038',
    customerName: 'Kavita Reddy',
    customerPhone: '9701223344',
    customerEmail: 'kavita.r@example.com',
    orderPaymentMethod: 'upi' as const,
    orderTotal: 899,
    items: [
      {
        productId: 'bee4-binary-marble-computer',
        title: 'Mechanical Binary Marble Computer Board',
        variant: 'Graphite & Amber Gates',
        quantity: 1,
        unitPrice: 899,
        image: IMG_BINARY_STEM,
      },
    ],
    reason: 'Damaged in Transit' as const,
    resolutionType: 'Refund to Original Payment / UPI ID' as const,
    customerComments:
      'Outer box was crushed on the bottom right corner and the carry bit rocker snapped during courier transit.',
    proofImages: [IMG_MECHANISM, IMG_BINARY_STEM],
    refundUpiId: 'kavita.reddy@okicici',
    status: 'Return Requested' as const,
    adminNote: 'Awaiting unpacking inspection from Banka desk.',
    reverseCourier: '',
    reverseAwb: '',
    replacementAwb: '',
    autoRestockEnabled: false,
    isRestocked: false,
    scrapRecorded: false,
    replacementPrintQueued: false,
    createdAt: '2026-11-15T14:20:00.000Z',
    updatedAt: '2026-11-15T14:20:00.000Z',
  },
  {
    id: 'rma-1042',
    rmaNumber: 'RMA-1042',
    orderNumber: 'BEE4-2037',
    customerName: 'Arjun Kulkarni',
    customerPhone: '9822334455',
    customerEmail: 'arjun.k@example.com',
    orderPaymentMethod: 'cod' as const,
    orderTotal: 849,
    items: [
      {
        productId: 'bee4-strandbeest-walker-kit',
        title: 'Strandbeest Wind-Powered Walking Creature Kit',
        variant: 'Ivory & Woodtone Linkage',
        quantity: 1,
        unitPrice: 849,
        image: HERO_IMAGE,
      },
    ],
    reason: 'Missing 3D Puzzle Piece / Part' as const,
    resolutionType: 'Free Instant Replacement' as const,
    customerComments:
      'Linkage crank #4 is missing from the zip pouch; kids want a replacement kit right away.',
    proofImages: [IMG_SCALE],
    status: 'Approved — Reverse Pickup Scheduled' as const,
    adminNote: 'Priority linkage replacement scheduled on Bambu Lab A1 Mini.',
    reverseCourier: 'Delhivery Reverse',
    reverseAwb: 'DRP7810293',
    replacementAwb: '',
    autoRestockEnabled: true,
    isRestocked: false,
    scrapRecorded: false,
    replacementPrintQueued: true,
    createdAt: '2026-11-14T11:10:00.000Z',
    updatedAt: '2026-11-15T09:30:00.000Z',
  },
  {
    id: 'rma-1043',
    rmaNumber: 'RMA-1043',
    orderNumber: 'BEE4-2036',
    customerName: 'Neha Gupta',
    customerPhone: '9818001122',
    customerEmail: 'neha.g@example.com',
    orderPaymentMethod: 'upi' as const,
    orderTotal: 499,
    items: [
      {
        productId: 'bee4-huarong-dao-slide-vault',
        title: 'Huarong Dao Three-Kingdoms 3D Slide Vault',
        variant: 'Amber & Slate Tiles',
        quantity: 1,
        unitPrice: 499,
        image: IMG_MATHS,
      },
    ],
    reason: 'Other' as const,
    resolutionType: 'Refund to Original Payment / UPI ID' as const,
    customerComments: 'Bought duplicate birthday gift; seal intact and unopened.',
    proofImages: [IMG_MATHS],
    status: 'Refund Completed' as const,
    adminNote: 'Returned box inspected at Banka Studio — 100% factory sealed & restocked.',
    reverseCourier: 'Shiprocket Reverse',
    reverseAwb: 'SRP4901228',
    replacementAwb: '',
    autoRestockEnabled: true,
    isRestocked: true,
    scrapRecorded: false,
    replacementPrintQueued: false,
    refundAmount: 499,
    refundMode: 'Original Source' as const,
    refundUtr: 'UTR491820394812',
    createdAt: '2026-11-12T08:45:00.000Z',
    updatedAt: '2026-11-15T17:15:00.000Z',
  },
];

export const INITIAL_INVENTORY_LOGS = [
  {
    id: 'inv-seed-1043',
    timestamp: '2026-11-15T17:15:00.000Z',
    productId: 'bee4-huarong-dao-slide-vault',
    productTitle: 'Huarong Dao Three-Kingdoms 3D Slide Vault',
    sku: 'BEE4-106',
    delta: 1,
    adjustmentType: 'rma_restock' as const,
    referenceId: 'RMA-1043',
    note: '+1 unit restocked from Return #RMA-1043',
  },
];


