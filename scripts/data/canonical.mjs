// Halo Mythic Foundry — Canonical Character Data Schema

import { MYTHIC_ACTOR_SCHEMA_VERSION, MYTHIC_DEFAULT_HEIGHT_RANGE_CM, MYTHIC_DEFAULT_WEIGHT_RANGE_KG } from '../config.mjs';
import { getCanonicalTrainingData } from '../mechanics/training.mjs';
import { buildCanonicalSkillsSchema } from '../mechanics/skills.mjs';

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
      soldierTypeRow: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      creationPoints: { pool: 100, str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
      advancements: { str: 0, tou: 0, agi: 0, wfm: 0, wfr: 0, int: 0, per: 0, crg: 0, cha: 0, ldr: 0 },
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
      soldierTypeLeapModifier: 0,
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
      targetSwitch: {
        combatId: "",
        round: 0,
        lastTargetId: "",
        switchCount: 0
      }
    },
    gravity: 1.0,
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
