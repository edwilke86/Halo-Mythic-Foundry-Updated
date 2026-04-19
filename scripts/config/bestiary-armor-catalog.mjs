export const MYTHIC_BESTIARY_ARMOR_SYSTEMS = Object.freeze({
  NONE: "none",
  STANDARD: "standard",
  TIERED: "tiered",
  SHIELDED: "shielded",
  STRUCTURAL: "structural"
});

function preset(label, armor = {}, options = {}) {
  return {
    label,
    armor,
    shields: options.shields ?? null,
    modifiers: options.modifiers ?? null,
    notes: Array.isArray(options.notes) ? options.notes : [],
    metadata: options.metadata ?? {}
  };
}

export const MYTHIC_BESTIARY_ARMOR_FAMILIES = Object.freeze({
  none: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.NONE,
    label: "No Armor",
    locations: [],
    defaultPresetId: "none",
    presets: {
      none: preset("None", {})
    }
  },
  human_standard: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Human Standard",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "cov-war",
    presets: {
      "pre-war": preset("Pre-War", { head: 17, arms: 18, chest: 19, legs: 18 }),
      "cov-war": preset("Cov War", { head: 18, arms: 19, chest: 20, legs: 19 }),
      "post-war": preset("Post War", { head: 19, arms: 19, chest: 20, legs: 20 })
    }
  },
  human_odst: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "ODST",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "cov-war",
    presets: {
      "pre-war": preset("Pre-War", { head: 20, arms: 19, chest: 20, legs: 19 }),
      "cov-war": preset("Cov War", { head: 20, arms: 19, chest: 20, legs: 19 }),
      "post-war": preset("Post War", { head: 21, arms: 20, chest: 21, legs: 20 })
    }
  },
  human_police: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Police",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "cov-war",
    presets: {
      "pre-war": preset("Pre-War", { head: 14, arms: 15, chest: 15, legs: 15 }),
      "cov-war": preset("Cov War", { head: 15, arms: 15, chest: 16, legs: 15 }),
      "post-war": preset("Post War", { head: 15, arms: 16, chest: 16, legs: 15 })
    }
  },
  mjolnir: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.SHIELDED,
    label: "Mjolnir",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "mark-vi",
    presets: {
      "mark-iv": preset("Mark IV", { head: 22, arms: 22, chest: 24, legs: 22 }, {
        shields: { integrity: 0, rechargeDelay: 0, rechargeRate: 0 },
        modifiers: { mythicStrengthBonus: 1, mythicToughnessBonus: 1, mythicAgilityBonus: 1 }
      }),
      "mark-v": preset("Mark V", { head: 23, arms: 23, chest: 25, legs: 23 }, {
        shields: { integrity: 150, rechargeDelay: 4, rechargeRate: 50 },
        modifiers: { mythicStrengthBonus: 1, mythicToughnessBonus: 1, mythicAgilityBonus: 1 }
      }),
      "mark-vi": preset("Mark VI", { head: 24, arms: 24, chest: 26, legs: 24 }, {
        shields: { integrity: 200, rechargeDelay: 4, rechargeRate: 60 },
        modifiers: { mythicStrengthBonus: 2, mythicToughnessBonus: 2, mythicAgilityBonus: 1 }
      }),
      "gen-ii": preset("Gen II", { head: 24, arms: 24, chest: 26, legs: 24 }, {
        shields: { integrity: 225, rechargeDelay: 4, rechargeRate: 75 },
        modifiers: { mythicStrengthBonus: 2, mythicToughnessBonus: 2, mythicAgilityBonus: 2 }
      }),
      "gen-iii": preset("Gen III", { head: 25, arms: 25, chest: 27, legs: 25 }, {
        shields: { integrity: 250, rechargeDelay: 3, rechargeRate: 90 },
        modifiers: { mythicStrengthBonus: 3, mythicToughnessBonus: 2, mythicAgilityBonus: 2 }
      })
    }
  },
  unggoy: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Unggoy",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor",
    presets: {
      minor: preset("Minor", { head: 18, arms: 19, chest: 20, legs: 19 }),
      major: preset("Major", { head: 19, arms: 19, chest: 20, legs: 19 }),
      ultra: preset("Ultra", { head: 20, arms: 19, chest: 22, legs: 19 })
    }
  },
  sangheili_harness: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.SHIELDED,
    label: "Sangheili Harness",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor-combat-harness",
    presets: {
      "minor-combat-harness": preset("Minor Combat Harness", { head: 20, arms: 21, chest: 22, legs: 21 }, {
        shields: { integrity: 100, rechargeDelay: 3, rechargeRate: 50 },
        notes: ["Experience +20"]
      }),
      "major-combat-harness": preset("Major Combat Harness", { head: 21, arms: 22, chest: 23, legs: 22 }, {
        shields: { integrity: 125, rechargeDelay: 3, rechargeRate: 50 },
        notes: ["Experience +30"]
      }),
      "ultra-combat-harness": preset("Ultra Combat Harness", { head: 21, arms: 22, chest: 23, legs: 22 }, {
        shields: { integrity: 150, rechargeDelay: 3, rechargeRate: 50 },
        notes: ["Experience +40"]
      }),
      "zealot-combat-harness": preset("Zealot Combat Harness", { head: 20, arms: 21, chest: 22, legs: 21 }, {
        shields: { integrity: 175, rechargeDelay: 4, rechargeRate: 50 },
        notes: ["Built-in Active Cloaking System", "Experience +50"],
        metadata: { cloakingDelayOverride: 5, hasActiveCloaking: true }
      })
    }
  },
  jiralhanae_harness: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.SHIELDED,
    label: "Jiralhanae Harness",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor-combat-harness",
    presets: {
      "minor-combat-harness": preset("Minor Combat Harness", { head: 15, arms: 16, chest: 17, legs: 16 }, {
        shields: { integrity: 50, rechargeDelay: 3, rechargeRate: 25 },
        notes: ["Era: Schism", "Experience +15"]
      }),
      "major-combat-harness": preset("Major Combat Harness", { head: 17, arms: 17, chest: 19, legs: 16 }, {
        shields: { integrity: 75, rechargeDelay: 3, rechargeRate: 25 },
        notes: ["Era: Schism", "Experience +20"]
      }),
      "captain-major": preset("Captain Major", { head: 19, arms: 19, chest: 20, legs: 19 }, {
        shields: { integrity: 120, rechargeDelay: 3, rechargeRate: 20 },
        notes: ["Era: Schism", "Experience +25"]
      }),
      "captain-ultra": preset("Captain Ultra", { head: 20, arms: 19, chest: 20, legs: 20 }, {
        shields: { integrity: 125, rechargeDelay: 3, rechargeRate: 25 },
        notes: ["Era: Schism", "Built-in Active Cloaking System", "Experience +25", "Pre-schism armor variants are not automated in this preset set; GM manual override may be required."],
        metadata: { cloakingDelayOverride: 5, hasActiveCloaking: true, preSchismManualOverrideRecommended: true }
      })
    }
  },
  kigyar_standard: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Kig-Yar Standard",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor",
    presets: {
      minor: preset("Minor", { head: 18, arms: 19, chest: 20, legs: 19 }),
      major: preset("Major", { head: 20, arms: 19, chest: 21, legs: 20 }),
      zealot: preset("Zealot", { head: 23, arms: 21, chest: 22, legs: 21 })
    }
  },
  sanshyuum_armor: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.SHIELDED,
    label: "San'Shyuum Armor",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "armor",
    presets: {
      armor: preset("Armor", { head: 20, arms: 19, chest: 21, legs: 20 }, {
        shields: { integrity: 175, rechargeDelay: 4, rechargeRate: 50 },
        modifiers: { agilityBonus: -10 },
        notes: ["Experience +10"]
      })
    }
  },
  prelate_powered_armor: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.SHIELDED,
    label: "Prelate Powered Armor",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "prelate-powered-armor",
    presets: {
      "prelate-powered-armor": preset("Prelate Powered Armor", { head: 23, arms: 25, chest: 26, legs: 25 }, {
        shields: { integrity: 400, rechargeDelay: 5, rechargeRate: 25 },
        modifiers: { mythicStrengthBonus: 3, mythicToughnessBonus: 2, mythicAgilityBonus: 2 },
        notes: ["Built-in VISR", "One arm can activate hardlight shield", "Experience +250"],
        metadata: {
          hardlightGauntletShielding: true,
          boosterRules: {
            preservedForFutureAutomation: true,
            baselineMythicBonusesGranted: true
          }
        }
      })
    }
  },
  lekgolo: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Lekgolo",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "standard-armor",
    presets: {
      "standard-armor": preset("Standard Armor", { head: 40, arms: 40, chest: 50, legs: 40 }),
      "ironclad-armor": preset("Ironclad Armor", { head: 50, arms: 45, chest: 60, legs: 50 }, { modifiers: { agilityBonus: -5 } }),
      "gold-armor": preset("Gold Armor", { head: 55, arms: 45, chest: 55, legs: 50 }, { notes: ["Glows, easily spotted in Low-Light and Darkness"] }),
      "elder-armor": preset("Elder Armor", { head: 55, arms: 50, chest: 60, legs: 50 }, { modifiers: { agilityBonus: -5 } }),
      "ultra-armor": preset("Ultra Armor", { head: 60, arms: 50, chest: 65, legs: 55 }, { modifiers: { agilityBonus: -10 }, notes: ["Glows, easily spotted in Darkness"] })
    }
  },
  slugmen: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Slugmen",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "standard-armor",
    presets: {
      "standard-armor": preset("Standard Armor", { head: 28, arms: 28, chest: 38, legs: 30 }),
      "ironclad-armor": preset("Ironclad Armor", { head: 33, arms: 36, chest: 48, legs: 33 }, { modifiers: { agilityBonus: -10 } }),
      "captain-armor": preset("Captain Armor", { head: 30, arms: 31, chest: 40, legs: 33 }, { modifiers: { agilityBonus: -10 } }),
      "ultra-armor": preset("Ultra Armor", { head: 38, arms: 34, chest: 45, legs: 40 }, { notes: ["Glows, easily spotted in Low-Light and Darkness"] })
    }
  },
  yanmee: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Yanme'e",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor",
    presets: {
      minor: preset("Minor", { head: 13, arms: 15, chest: 15, legs: 14 }),
      major: preset("Major", { head: 13, arms: 15, chest: 16, legs: 15 })
    }
  },
  huragok_harness: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Huragok Harness",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "protective-harness",
    presets: {
      "slave-explosive-harness": preset("Slave Explosive Harness", { head: 20, arms: null, chest: 24, legs: null }, {
        notes: ["Explodes when harness takes 50 damage in a single attack or when Huragok dies", "Can be remotely detonated by commander"],
        metadata: { explosiveHarness: true, explosiveDamageThreshold: 50, remoteDetonation: true }
      }),
      "protective-harness": preset("Protective Harness", { head: 20, arms: 12, chest: 24, legs: 12 }),
      "heavy-harness": preset("Heavy Harness", { head: 24, arms: 14, chest: 26, legs: 14 })
    }
  },
  gasgira: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.TIERED,
    label: "Gasgira",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "minor",
    presets: {
      minor: preset("Minor", { head: 18, arms: 19, chest: 20, legs: 19 }),
      major: preset("Major", { head: 19, arms: 20, chest: 22, legs: 19 })
    }
  },
  promethean_soldier: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Promethean Soldier",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "soldier-armor",
    presets: {
      "soldier-armor": preset("Promethean Soldier", { head: 25, arms: 25, chest: 35, legs: 25 })
    }
  },
  promethean_knight: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Promethean Knight",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "knight-armor",
    presets: {
      "knight-armor": preset("Promethean Knight", { head: 40, arms: 30, chest: 45, legs: 30 })
    }
  },
  promethean_watcher: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Promethean Watcher",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "watcher-armor",
    presets: {
      "watcher-armor": preset("Promethean Watcher", { head: 16, arms: 17, chest: 18, legs: null })
    }
  },
  promethean_crawler: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Promethean Crawler",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "crawler-armor",
    presets: {
      "crawler-armor": preset("Promethean Crawler", { head: 14, arms: 15, chest: 16, legs: 15 })
    }
  },
  promethean_cavalier: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STANDARD,
    label: "Promethean Cavalier",
    locations: ["head", "arms", "chest", "legs"],
    defaultPresetId: "cavalier-armor",
    presets: {
      "cavalier-armor": preset("Promethean Cavalier", { head: 35, arms: 28, chest: 30, legs: 28 })
    }
  },
  monitor: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Monitor",
    locations: ["body"],
    defaultPresetId: "monitor-armor",
    presets: {
      "monitor-armor": preset("Monitor Armor", { body: 30 }, {
        shields: { integrity: 150, rechargeDelay: 3, rechargeRate: 50 },
        notes: ["Called shot to eye reduces armor by 7", "Armor does not take x2 damage from attacks with a Kill Radius"]
      })
    }
  },
  aggressor_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Aggressor Sentinel",
    locations: ["body"],
    defaultPresetId: "aggressor-armor",
    presets: {
      "aggressor-armor": preset("Aggressor Armor", { body: 22 }, {
        shields: { integrity: 200, rechargeDelay: 2, rechargeRate: 50 },
        notes: ["Shield extends outward half a meter in each direction", "Attacks missing by 1 or less DoF still hit active shield", "Shield does not activate against slow attacks (including melee and thrown)", "Shield does activate for explosives"],
        metadata: { nearMissIntercept: true, slowAttackBypass: true }
      })
    }
  },
  golden_aggressor_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Golden Aggressor Sentinel",
    locations: ["body"],
    defaultPresetId: "golden-aggressor-armor",
    presets: {
      "golden-aggressor-armor": preset("Golden Aggressor Armor", { body: 24 }, {
        shields: { integrity: 200, rechargeDelay: 2, rechargeRate: 75 },
        notes: ["Attacks missing by 1 or less DoF still hit active shield", "Shield does not activate against slow attacks (including melee and thrown)", "Shield does activate for explosives"],
        metadata: { nearMissIntercept: true, slowAttackBypass: true }
      })
    }
  },
  regulator_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Regulator Sentinel",
    locations: ["body"],
    defaultPresetId: "regulator-armor",
    presets: {
      "regulator-armor": preset("Regulator Armor", { body: 20 }, {
        shields: { integrity: 200, rechargeDelay: 2, rechargeRate: 50 },
        notes: ["Attacks missing by 1 or less DoF still hit active shield", "Shield does not activate against slow attacks (including melee and thrown)", "Shield does activate for explosives"],
        metadata: { nearMissIntercept: true, slowAttackBypass: true }
      })
    }
  },
  enforcer_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Enforcer Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "enforcer-armor",
    presets: {
      "enforcer-armor": preset("Enforcer Armor", { bodyFront: 25, bodyRear: 30 }, {
        shields: { integrity: 300, rechargeDelay: 6, rechargeRate: 300 },
        notes: ["Forward shield extends 10m length, 8m height", "Near-misses can hit active shield", "Shield ignores Penetrating Special Rule"],
        metadata: { directionalShield: "front", shieldIgnoresPenetrating: true, nearMissIntercept: true }
      })
    }
  },
  super_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Super Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "super-sentinel-armor",
    presets: {
      "super-sentinel-armor": preset("Super Sentinel Armor", { bodyFront: 26, bodyRear: 23 }, {
        shields: { integrity: 500, rechargeDelay: 2, rechargeRate: 100 },
        notes: ["Stronger front armor", "Shields do not activate against slow attacks, but do activate for explosives"],
        metadata: { directionalArmorBias: "front", slowAttackBypass: true }
      })
    }
  },
  constructor_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Constructor Sentinel",
    locations: ["body"],
    defaultPresetId: "constructor-armor",
    presets: {
      "constructor-armor": preset("Constructor Armor", { body: 14 })
    }
  },
  controller_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Controller Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "controller-armor",
    presets: {
      "controller-armor": preset("Controller Armor", { bodyFront: 20, bodyRear: 25 }, {
        shields: { integrity: 300, rechargeDelay: 5, rechargeRate: 300 },
        notes: ["Forward shield interception", "Shield ignores Penetrating"],
        metadata: { directionalShield: "front", shieldIgnoresPenetrating: true }
      })
    }
  },
  protector_i00_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Protector I-00 Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "protector-i00-armor",
    presets: {
      "protector-i00-armor": preset("Protector I-00 Armor", { bodyFront: 52, bodyRear: 35 }, {
        shields: { integrity: 500, rechargeDelay: 2, rechargeRate: 100 },
        notes: ["Stronger front armor", "Shields do not activate against slow attacks"],
        metadata: { directionalArmorBias: "front", slowAttackBypass: true }
      })
    }
  },
  protector_sw0459_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Protector SW-0459 Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "protector-sw0459-armor",
    presets: {
      "protector-sw0459-armor": preset("Protector SW-0459 Armor", { bodyFront: 18, bodyRear: 14 }, {
        shields: { integrity: 100, rechargeDelay: 2, rechargeRate: 100 },
        notes: ["Stronger front armor", "Shields do not activate against slow attacks"],
        metadata: { directionalArmorBias: "front", slowAttackBypass: true }
      })
    }
  },
  onyx_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Onyx Sentinel",
    locations: ["body", "boom"],
    defaultPresetId: "onyx-armor",
    presets: {
      "onyx-armor": preset("Onyx Armor", { body: 18, boom: 13 }, {
        shields: { integrity: 250, rechargeDelay: 3, rechargeRate: 150 },
        notes: ["Body is primary hit location", "Arms/legs hit results remap to boom", "Shield activates for fast projectiles and explosives", "Cannot attack while shield remains active"],
        metadata: { boomHitRemap: true, projectileAndExplosiveOnlyShield: true, attackDropsShieldForRound: true }
      })
    }
  },
  retriever_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Retriever Sentinel",
    locations: ["bodyFront", "bodyRear"],
    defaultPresetId: "retriever-armor",
    presets: {
      "retriever-armor": preset("Retriever Armor", { bodyFront: 35, bodyRear: 45 }, {
        shields: { integrity: 300, rechargeDelay: 5, rechargeRate: 300 },
        notes: ["Forward shield interception", "Shield ignores Penetrating"],
        metadata: { directionalShield: "front", shieldIgnoresPenetrating: true }
      })
    }
  },
  steward_sentinel: {
    armorSystem: MYTHIC_BESTIARY_ARMOR_SYSTEMS.STRUCTURAL,
    label: "Steward Sentinel",
    locations: ["body"],
    defaultPresetId: "steward-armor",
    presets: {
      "steward-armor": preset("Steward Armor", { body: 19 })
    }
  }
});

export const MYTHIC_BESTIARY_ARMOR_FAMILY_ALIASES = Object.freeze({
  promethean_unit: "promethean_soldier"
});
