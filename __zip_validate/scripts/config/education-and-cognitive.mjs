// Halo Mythic Foundry — Education and Cognitive Pattern catalogs

// --- Education Definitions (Halo Mythic rulebook p.106) ---
export const MYTHIC_EDUCATION_DEFINITIONS = [
  // General Educations
  { name: "Aeronautics",               difficulty: "advanced", skills: ["Stunting", "Pilot", "Evasion", "Technology"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Agriculture",               difficulty: "basic",    skills: ["Technology", "Survival"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Architecture",              difficulty: "advanced", skills: ["Technology", "Security"],                                                              costPlus5:  75, costPlus10: 125 },
  { name: "Armor Smithing",            difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Astronautics",              difficulty: "advanced", skills: ["Pilot", "Technology", "Stunting", "Evasion"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Astrophysics",              difficulty: "advanced", skills: ["Pilot", "Technology"],                                                                 costPlus5: 100, costPlus10: 150 },
  { name: "Bartering",                 difficulty: "basic",    skills: ["Appeal", "Investigation", "Deception"],                                                costPlus5:  50, costPlus10: 100 },
  { name: "Brewing",                   difficulty: "basic",    skills: ["Survival"],                                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Carpentry",                 difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Computer Security",         difficulty: "advanced", skills: ["Security", "Cryptography"],                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Construction",              difficulty: "basic",    skills: ["Technology", "Demolition"],                                                            costPlus5: 100, costPlus10: 150 },
  { name: "Culinary",                  difficulty: "basic",    skills: ["Survival"],                                                                            costPlus5:  50, costPlus10: 100 },
  { name: "Demolitions Assembly",      difficulty: "basic",    skills: ["Demolition"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Economics",                 difficulty: "advanced", skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5:  75, costPlus10: 125 },
  { name: "Etiquette",                 difficulty: "basic",    skills: ["Appeal", "Deception"],                                                                 costPlus5:  50, costPlus10: 100 },
  { name: "Faction Culture",           difficulty: "basic",    skills: ["Appeal", "Investigation"],                                                             costPlus5:  50, costPlus10: 100 },
  { name: "Faction History",           difficulty: "basic",    skills: ["Appeal", "Command", "Investigation"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Faction Law",               difficulty: "advanced", skills: ["Command", "Investigation", "Deception", "Negotiation"],                                costPlus5: 100, costPlus10: 150 },
  { name: "Faction Linguistics",       difficulty: "basic",    skills: ["Cryptography", "Technology"],                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Faction Literature",        difficulty: "basic",    skills: ["Appeal", "Command", "Investigation"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Faction Medical Science",   difficulty: "advanced", skills: ["Medication", "Survival", "Interrogation"],                                             costPlus5: 100, costPlus10: 150 },
  { name: "Faction Military",          difficulty: "advanced", skills: ["Command", "Appeal", "Investigation", "Deception", "Interrogation", "Security"],        costPlus5: 100, costPlus10: 150 },
  { name: "Faction Psychology",        difficulty: "advanced", skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5: 150, costPlus10: 200 },
  { name: "Faction Religion",          difficulty: "basic",    skills: ["Appeal", "Command", "Deception", "Interrogation", "Intimidation", "Negotiation"],      costPlus5:  50, costPlus10: 100 },
  { name: "Faction Vehicle Maintenance", difficulty: "basic",  skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Faction Weaponry",          difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5: 100, costPlus10: 150 },
  { name: "Flood Biology",             difficulty: "advanced", skills: ["Medication"],                                                                          costPlus5: 200, costPlus10: 250, restricted: true },
  { name: "Forerunner Artifacts",      difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5: 250, costPlus10: 300, restricted: true },
  { name: "Forerunner Linguistics",    difficulty: "advanced", skills: ["Technology", "Cryptography", "Investigation"],                                         costPlus5: 150, costPlus10: 200, restricted: true },
  { name: "Forerunner Weaponry",       difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5: 200, costPlus10: 250, restricted: true },
  { name: "Ground Vehicle Dynamics",   difficulty: "basic",    skills: ["Pilot", "Technology", "Stunting", "Evasion"],                                          costPlus5: 100, costPlus10: 150 },
  { name: "Hunting and Fishing",       difficulty: "basic",    skills: ["Investigation", "Deception", "Athletics", "Technology", "Security", "Survival"],       costPlus5:  50, costPlus10: 100 },
  { name: "Locksmith",                 difficulty: "basic",    skills: ["Technology", "Security"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Martial Arts",              difficulty: "basic",    skills: ["Evasion", "Athletics"],                                                                costPlus5: 100, costPlus10: 150 },
  { name: "Mathematics",               difficulty: "basic",    skills: ["Security", "Cryptography", "Gambling"],                                                costPlus5: 100, costPlus10: 150 },
  { name: "Merchant",                  difficulty: "basic",    skills: ["Appeal", "Negotiation", "Deception"],                                                  costPlus5:  50, costPlus10: 100 },
  { name: "Military Command",          difficulty: "advanced", skills: ["Command", "Appeal", "Interrogation", "Negotiation", "Deception"],                      costPlus5: 100, costPlus10: 150 },
  { name: "Mount Training",            difficulty: "basic",    skills: ["Appeal", "Command", "Deception", "Intimidation", "Investigation", "Stunting"],         costPlus5:  50, costPlus10: 100 },
  { name: "Musical Training (Chosen Instrument)", difficulty: "basic", skills: ["Appeal"],                                                                      costPlus5:  25, costPlus10:  50 },
  { name: "Planetary Science",         difficulty: "advanced", skills: ["Survival", "Camouflage"],                                                              costPlus5: 100, costPlus10: 150 },
  { name: "Slipspace Travel",          difficulty: "advanced", skills: ["Pilot (Space)", "Navigation", "Technology", "Stunting"],                               costPlus5: 250, costPlus10: 300 },
  { name: "Tailor",                    difficulty: "basic",    skills: ["Survival", "Technology"],                                                              costPlus5:  50, costPlus10: 100 },
  { name: "Tanning (Leather)",         difficulty: "basic",    skills: ["Technology"],                                                                          costPlus5:  50, costPlus10: 100 },
  { name: "Weapon Smithing",           difficulty: "advanced", skills: ["Technology"],                                                                          costPlus5:  75, costPlus10: 125 },
  // Street Smarts
  { name: "Black Market",              difficulty: "advanced", skills: ["Investigation", "Appeal", "Negotiation"],                                               costPlus5: 100, costPlus10: 150, restricted: true, category: "street-smarts" },
  { name: "Crime Organizations",       difficulty: "advanced", skills: ["All Social Skills"],                                                                   costPlus5: 100, costPlus10: 150, category: "street-smarts" },
  { name: "Streetwise",                difficulty: "basic",    skills: ["Investigation", "Charisma"],                                                           costPlus5:  25, costPlus10:  50, category: "street-smarts" },
  { name: "Subculture",                difficulty: "basic",    skills: ["All Social Skills"],                                                                   costPlus5:  50, costPlus10: 100, category: "street-smarts" }
];

// --- Cognitive Pattern Fragments (Smart AI) ---
export const MYTHIC_COGNITIVE_PATTERN_FRAGMENTS = {
  social: {
    descriptors: [
      "Influence", "Diplomatic", "Psychological", "Persuasion", "Consensus",
      "Authority", "Manipulative", "Behavioral", "Charismatic", "Coercive",
      "Adaptive", "Empathic", "Governance", "Social", "Command"
    ],
    architectures: [
      "Influence Matrix", "Consensus Engine", "Negotiation Framework",
      "Authority Protocol", "Social Nexus", "Behavioral Lattice",
      "Persuasion Core", "Command Array", "Diplomatic System",
      "Psychology Network", "Charisma Kernel", "Leadership Construct"
    ]
  },
  movement: {
    descriptors: [
      "Kinetic", "Trajectory", "Reflexive", "Dynamic", "Reactive",
      "Velocity", "Mobile", "Evasive", "Agile", "Responsive",
      "Momentum", "Angular", "Acceleration", "Vector", "Combat"
    ],
    architectures: [
      "Navigation Matrix", "Motion Engine", "Trajectory Lattice",
      "Velocity Framework", "Flight Core", "Evasion Protocol",
      "Kinetic System", "Agility Nexus", "Dynamic Array",
      "Reflex Network", "Mobility Kernel", "Combat Grid"
    ]
  },
  fieldcraft: {
    descriptors: [
      "Operational", "Strategic", "Stealth", "Encrypted", "Systems",
      "Analytical", "Deductive", "Defensive", "Systematic", "Predictive",
      "Recursive", "Distributed", "Probabilistic", "Heuristic", "Tactical"
    ],
    architectures: [
      "Battleflow Matrix", "Predictive Cascade", "Optimization Engine",
      "Resource Nexus", "Security Protocol", "Logic Fractal",
      "Operational Core", "Data Lattice", "Stealth Architecture",
      "Tactical System", "Cipher Framework", "Recon Array",
      "Strategic Construct", "Infiltration Network", "Field Intelligence Kernel"
    ]
  },
  "technology:human": {
    descriptors: ["Engineering", "Systematic", "Algorithmic", "Hardware", "Integration"],
    architectures: [
      "Systems Engineering Matrix", "Hardware Optimization Engine",
      "Operational Logic Core", "Integration Architecture", "Systems Array"
    ]
  },
  "technology:covenant": {
    descriptors: ["Plasma", "Resonant", "Crystalline", "Harmonic", "Covenant"],
    architectures: [
      "Plasma Systems Nexus", "Energy Lattice",
      "Covenant Resonance Framework", "Crystal Logic Core", "Plasma Array"
    ]
  },
  "technology:forerunner": {
    descriptors: ["Quantum", "Ancilla", "Primordial", "Spectral", "Transcendent"],
    architectures: [
      "Quantum Lattice", "Ancilla Architecture",
      "Forerunner Logic Core", "Primordial Systems Matrix", "Transcendent Array"
    ]
  },
  "medication:human": {
    descriptors: ["Biocognitive", "Diagnostic", "Biomonitor", "Regenerative", "Medical"],
    architectures: [
      "Medical Nexus", "Physiology Engine", "Diagnostic Framework",
      "Biomonitor Core", "Regeneration Array"
    ]
  },
  "medication:covenant": {
    descriptors: ["Symbiotic", "Biovital", "Restorative", "Curative", "Mending"],
    architectures: ["Covenant Physiology Nexus", "Vital Signs Engine", "Restorative Core"]
  },
  "medication:xenobiology": {
    descriptors: ["Xenoanalysis", "Exobiological", "Symbiotic", "Xenobiotic", "Alien"],
    architectures: [
      "Alien Physiology Matrix", "Symbiotic Diagnostic Pattern",
      "Xenobiotic Lattice", "Exobiology Core", "Xenoanalysis Array"
    ]
  },
  "navigation:ground-air": {
    descriptors: ["Terrain", "Atmospheric", "Topographic", "Geospatial", "Aerial"],
    architectures: [
      "Terrain Mapping Matrix", "Atmospheric Trajectory Engine",
      "Ground Navigation Nexus", "Topographic Core", "Aerial Systems Array"
    ]
  },
  "navigation:space": {
    descriptors: ["Astrogation", "Slipspace", "Orbital", "Stellar", "Navigational"],
    architectures: [
      "Astrogation Matrix", "Slipspace Navigation Core",
      "Orbital Trajectory Lattice", "Stellar Navigation Framework", "Deep Space Array"
    ]
  },
  "pilot:space": {
    descriptors: ["Void", "Interstellar", "Cosmic"],
    architectures: ["Slipspace Nexus", "Orbital Control Matrix", "Void Navigation Core"]
  }
};

export const MYTHIC_COGNITIVE_PATTERN_SKILL_GROUP_MAP = {
  appeal: "social", command: "social", deception: "social",
  gambling: "social", interrogation: "social", intimidation: "social", negotiation: "social",
  athletics: "movement", evasion: "movement", stunting: "movement",
  pilot: "movement", navigation: "movement",
  camouflage: "fieldcraft", cryptography: "fieldcraft", demolition: "fieldcraft",
  investigation: "fieldcraft", security: "fieldcraft", survival: "fieldcraft",
  medication: "fieldcraft", technology: "fieldcraft"
};
