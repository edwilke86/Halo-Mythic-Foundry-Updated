// Halo Mythic Foundry — Canonical Character Data Schema

import { MYTHIC_ACTOR_SCHEMA_VERSION, MYTHIC_DEFAULT_HEIGHT_RANGE_CM, MYTHIC_DEFAULT_WEIGHT_RANGE_KG } from '../config.mjs';
import { getCanonicalTrainingData } from '../mechanics/training.mjs';
import { buildCanonicalSkillsSchema } from '../mechanics/skills.mjs';
import { MYTHIC_SHEET_APPEARANCE_DEFAULTS } from '../utils/sheet-appearance.mjs';

export function getCanonicalCharacterSystemData() {
  return {
    schemaVersion: MYTHIC_ACTOR_SCHEMA_VERSION,
    header: {
      faction: "",
      logoPath: "",
      soldierType: "",
      rank: "",
      buildSize: "",
      specialisation: "",
      playerName: "",
      race: "",
      upbringing: "",
      environment: "",
      lifestyle: "",
      gender: ""
    },
    sheetAppearance: foundry.utils.deepClone(MYTHIC_SHEET_APPEARANCE_DEFAULTS),
    characteristics: {
      str: 0,
      tou: 0,
      agi: 0,
      wfm: 0,
      wfr: 0,
      int: 0,
      per: 0,
      crg: 0,
      cha: 0,
      ldr: 0
    },
    charBuilder: {
      managed: false,
      lowerTierUnlockEnabled: false,
      soldierTypeRow: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      creationPoints: { pool: 100, str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      advancements: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      purchasedAdvancements: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      misc: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      soldierTypeAdvancementsRow: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 }
    },
    mythic: {
      characteristics: {
        str: 0,
        tou: 0,
        agi: 0
      },
      fixedCarryWeight: 0,
      soldierTypeChargeRunAgiBonus: 0,
      soldierTypeStrCarryMultiplier: 1,
      soldierTypeTouCarryMultiplier: 1,
      soldierTypeTouWoundsMultiplier: 1,
      soldierTypeLeapMultiplier: 1,
      soldierTypeJumpMultiplier: 1,
      soldierTypeLeapModifier: 0,
      soldierTypeLeapAgiBonus: 0,
      miscLeapModifier: 0,
      miscCarryBonus: 0,
      miscWoundsModifier: 0,
      naturalArmorModifier: 0,
      flyCombatActive: false,
      requiredUpbringing: {
        enabled: false,
        upbringing: "",
        removeOtherUpbringings: false,
        notes: ""
      },
      mjolnirArmorSelection: {
        enabled: false
      },
      spartanCarryWeight: {
        enabled: false
      },
      allowedUpbringings: {
        enabled: false,
        upbringings: [],
        removeOtherUpbringings: false,
        notes: ""
      },
      gammaCompanyOption: {
        enabled: false,
        defaultSelected: false,
        prompt: "",
        grantAbility: "Adrenaline Rush"
      },
      ordinanceReady: {
        enabled: false,
        supportPointCost: 1,
        maxUsesPerEncounter: 1,
        notes: ""
      }
    },
    combat: {
      wounds: { current: 0, max: 0 },
      woundsBar: { value: 0, max: 0 },
      fatigue: { current: 0, max: 0 },
      luck: { current: 6, max: 6 },
      supportPoints: { current: 0, max: 0 },
      cr: 0,
      shields: {
        current: 0,
        integrity: 0,
        rechargeDelay: 0,
        rechargeRate: 0
      },
      shieldsBar: { value: 0, max: 0 },
      dr: {
        armor: {
          head: 0,
          chest: 0,
          lArm: 0,
          rArm: 0,
          lLeg: 0,
          rLeg: 0
        }
      },
      reactions: { count: 0 },
      actionEconomy: {
        combatId: "",
        round: 0,
        turn: 0,
        halfActionsSpent: 0,
        history: []
      },
      autoFireTracker: {
        combatId: "",
        round: 0,
        weapons: {}
      },
      targetSwitch: {
        combatId: "",
        round: 0,
        lastTargetId: "",
        switchCount: 0
      }
    },
    gravity: 1.0,
    perceptiveRange: {
      lightingCondition: "normal"
    },
    equipment: {
      credits: 0,
      carriedWeight: 0,
      primaryWeapon: "",
      secondaryWeapon: "",
      armorName: "",
      utilityLoadout: "",
      carriedIds: [],
      ammoPools: {},
      ballisticContainers: {},
      energyCells: {},
      weaponState: {},
      activePackSelection: {
        value: "",
        group: "",
        name: "",
        description: "",
        items: [],
        packKey: "",
        source: "",
        grants: [],
        appliedAt: ""
      },
      equipped: {
        weaponIds: [],
        armorId: "",
        wieldedWeaponId: ""
      },
      inventoryNotes: ""
    },
    medical: {
      status: "",
      treatmentNotes: "",
      recoveryNotes: "",
      activeEffects: [],
      gammaCompany: {
        enabled: false,
        smootherApplications: 0,
        lastAppliedAt: ""
      }
    },
    advancements: {
      xpEarned: 0,
      xpSpent: 0,
      unlockedFeatures: "",
      spendLog: "",
      transactionNotes: "",
      transactions: [],
      purchases: {
        woundUpgrades: 0
      },
      queue: {
        abilities: [],
        educations: [],
        skillRanks: {},
        weaponTraining: {},
        factionTraining: {},
        luckPoints: 0,
        woundUpgrades: 0,
        characteristicAdvancements: {},
        characteristicOther: {},
        languages: []
      },
      outliers: {
        purchases: []
      },
      creationPath: {
        upbringingItemId: "",
        upbringingSelections: {},
        environmentItemId: "",
        environmentSelections: {},
        lifestyles: [
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} },
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} },
          { itemId: "", mode: "manual", variantId: "", rollResult: 0, choiceSelections: {} }
        ]
      }
    },
    notes: {
    specialization: {
      selectedKey: "",
      confirmed: false,
      collapsed: true,
      limitedApprovalChecked: false
    },
      missionLog: "",
      personalNotes: "",
      gmNotes: ""
    },
    vehicles: {
      currentVehicleActorId: "",
      currentVehicle: "",
      role: "",
      callsign: "",
      notes: ""
    },
    settings: {
      initiative: {
        manualBonus: 0
      },
      automation: {
        enforceAbilityPrereqs: true,
        showRollHints: true,
        showWorkflowGuidance: true,
        keepSidebarCollapsed: false,
        preferTokenPreview: false
      }
    },
    training: getCanonicalTrainingData(),
    skills: buildCanonicalSkillsSchema(),
    biography: {
      languages: [],
      physical: {
        heightCm: 0,
        heightImperial: "",
        weightKg: 0,
        weightLbs: 0,
        heightRangeCm: {
          min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
          max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
        },
        weightRangeKg: {
          min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
          max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
        },
        height: "",
        weight: "",
        age: "",
        hair: "",
        skin: "",
        eyes: "",
        definingFeatures: "",
        generalDescription: "",
        extraFields: []
      },
      history: {
        birthdate: "",
        birthplace: "",
        education: [{ institution: "", notes: "" }],
        dutyStations: [{ location: "", status: "Current" }]
      },
      family: [{ name: "", relationship: "" }],
      generalEntries: [{ label: "General Biography", text: "" }]
    },
    ai: {
      cognitivePattern: "",
      cognitivePatternGenerated: false,
      oniModel: "",
      oniLogicStructure: "",
      oniSerial: ""
    }
  };
}

export function getCanonicalBestiarySystemData() {
  const base = getCanonicalCharacterSystemData();
  const baseCharacteristics = {
    str: 0,
    tou: 0,
    agi: 0,
    wfm: 0,
    wfr: 0,
    int: 0,
    per: 0,
    crg: 0,
    cha: 0,
    ldr: 0
  };

  base.header.playerName = "";
  base.header.upbringing = "";
  base.header.environment = "";
  base.header.lifestyle = "";

  base.bestiary = {
    rank: 1,
    subtype: "standard",
    singleDifficulty: false,
    advanceMythicStats: false,
    baseCharacteristics: foundry.utils.deepClone(baseCharacteristics),
    miscCharacteristics: foundry.utils.deepClone(baseCharacteristics),
    mythicBase: {
      str: 0,
      tou: 0,
      agi: 0
    },
    xpPayouts: {
      br1: 0,
      br2: 0,
      br3: 0,
      br4: 0,
      br5: 0
    },
    woundsByRank: {
      br1: 0,
      br2: 0,
      br3: 0,
      br4: 0,
      br5: 0
    },
    luckByRank: {
      br1: 0,
      br2: 0,
      br3: 1,
      br4: 3,
      br5: 6
    },
    size: "Normal",
    heightRangeCm: {
      min: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.min,
      max: MYTHIC_DEFAULT_HEIGHT_RANGE_CM.max
    },
    weightRangeKg: {
      min: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.min,
      max: MYTHIC_DEFAULT_WEIGHT_RANGE_KG.max
    },
    modifiers: {
      jumpMultiplier: 1,
      leapAgiBonus: 0,
      leapMultiplier: 1,
      runChargeAgiBonus: 0,
      naturalArmor: 0
    },
    equipmentList: [],
    equippedArmorId: "",
    weaponAmmo: {},
    flood: {
      formClass: "none",
      keymindRole: "none"
    }
  };

  return base;
}

export function getCanonicalVehicleSystemData() {
  return {
    schemaVersion: MYTHIC_ACTOR_SCHEMA_VERSION,
    designation: "",
    faction: "",
    factionTraining: "unsc",
    variant: "",
    sheetAppearance: foundry.utils.deepClone(MYTHIC_SHEET_APPEARANCE_DEFAULTS),
    price: 0,
    experience: 0,
    size: "mini",
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      weight: 0
    },
    characteristics: {
      str: 0,
      mythicStr: 0,
      agi: 0,
      mythicAgi: 0,
      wfr: 0,
      int: 0,
      per: 0
    },
    movement: {
      accelerate: { value: 0, max: 0 },
      brake: { value: 0, max: 0 },
      speed: { base: 0, value: 0, max: 0 },
      maneuver: { base: 0, total: 0, owner: "" },
      walker: {
        half: 0,
        full: 0,
        charge: 0,
        run: 0,
        jump: 0,
        leap: 0,
        owner: "",
        evasion: 0,
        parry: 0
      }
    },
    breakpoints: {
      wep: { value: 0, max: 0 },
      mob: { value: 0, max: 0 },
      eng: { value: 0, max: 0 },
      op: { value: 0, max: 0, noOptics: false },
      hull: {
        value: 0,
        max: 0,
        doom: {
          level: "tier_0",
          armor: 0,
          blast: 0,
          kill: 0,
          move: true,
          isDoomed: false,
          doomedTier: 0,
          doomedNegativeHullValue: 0,
          doomedArmorPenaltyFlat: 0,
          doomedArmorCompromised: false,
          doomedEffectiveArmorByLocation: {
            front: 0,
            back: 0,
            side: 0,
            top: 0,
            bottom: 0
          },
          doomedVehicleImmobile: false,
          doomedEngineAimingDisabled: false,
          doomedOnFire: false,
          doomedFlameRating: 0,
          doomedOccupantDamageMode: "none",
          doomedDetonationState: "none",
          doomedDetonationRoundsRemaining: 0,
          doomedDetonationSecondsRemaining: 0,
          doomedBlastRadius: 0,
          doomedKillRadius: 0,
          doomedImmediateDetonation: false,
          doomedHeavyPlatingLost: false,
          countdown: {
            active: false,
            expired: false,
            combatId: "",
            detonationRound: 0,
            roundsRemaining: 0
          }
        }
      }
    },
    armor: {
      front: { value: 0, max: 0 },
      back: { value: 0, max: 0 },
      side: { value: 0, max: 0 },
      top: { value: 0, max: 0 },
      bottom: { value: 0, max: 0 }
    },
    shields: {
      value: 0,
      max: 0,
      recharge: 0,
      delay: 0
    },
    doomed: {
      active: false,
      negativeHull: 0,
      currentTier: 0,
      doomedArmorPenaltyFlat: 0,
      doomedArmorCompromised: false,
      doomedEffectiveArmorByLocation: {
        front: 0,
        back: 0,
        side: 0,
        top: 0,
        bottom: 0
      },
      doomedVehicleImmobile: false,
      doomedEngineAimingDisabled: false,
      doomedOnFire: false,
      doomedFlameRating: 0,
      doomedOccupantsDamageMode: "none",
      doomedDetonationState: "none",
      doomedDetonationRoundsRemaining: 0,
      doomedDetonationSecondsRemaining: 0,
      doomedBlastRadius: 0,
      doomedKillRadius: 0,
      doomedImmediateDetonation: false,
      doomedHeavyPlatingLost: false,
      persistent: {
        onFire: false,
        flameRating: 0,
        occupantsDamageMode: "none",
        movementDisabled: false,
        engineAimingDisabled: false,
        detonation: {
          armed: false,
          mode: null,
          roundsRemaining: null,
          startedAtCombatRound: null,
          combatId: ""
        }
      }
    },
    overview: {
      ui: {
        statusExpanded: false,
        breakpointsExpanded: true,
        sections: {
          engineHull: true,
          weapons: false,
          optics: false,
          mobility: false,
          custom: true
        }
      },
      breakpoints: {
        engine: { current: 0 },
        hull: { current: 0 },
        weapons: { byId: {} },
        optics: { byId: {} },
        mobility: { byId: {} },
        custom: []
      },
      armor: {
        front: { current: 0 },
        back: { current: 0 },
        side: { current: 0 },
        top: { current: 0 },
        bottom: { current: 0 }
      },
      shields: {
        current: 0,
        max: 0,
        delay: 0,
        recharge: 0
      }
    },
    sizePoints: 0,
    weaponPoints: 0,
    crew: {
      capacity: {
        operators: 0,
        gunners: 0,
        passengers: 0
      },
      operators: [],
      gunners: [],
      complement: [],
      notes: ""
    },
    special: {
      allTerrain: { has: false },
      antiGrav: { has: false },
      autoloader: { has: false },
      boost: { has: false, value: 0 },
      continuousTrack: { has: false },
      enclosedTop: { has: true },
      flight: { has: false },
      heavyPlating: { has: false },
      neuralInterface: { has: false },
      openTop: { has: false },
      slipspace: { has: false },
      walkerStomp: { has: false }
    },
    automated: false,
    propulsion: {
      type: "wheels",
      value: 3,
      max: "3",
      state: {
        multiplier: 1,
        toHit: 0
      }
    },
    modifications: {
      mods: [],
      notes: ""
    },
    cargo: {
      total: 0,
      notes: ""
    },
    vehicle: {
      ammoTrackingMode: "standard",
      autoloader: {
        enabled: true
      }
    },
    weaponEmplacements: [],
    perceptiveRange: {
      total: 0
    },
    notes: ""
  };
}
