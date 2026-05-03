// Halo Mythic Foundry — Creation Path Definitions (Upbringing, Environment, Lifestyle)

// ── Upbringing definitions ─────────────────────────────────────────────────────
// Shorthand helpers used only inside these definitions:
// { kind:"stat", key, value } = characteristic modifier
// { kind:"wound", value }     = max-wound modifier (no key)
// group type "fixed"  = all options apply together (no player choice needed within the group)
// group type "choice" = player picks exactly one option from the group

export const MYTHIC_UPBRINGING_DEFINITIONS = [
  {
    name: "Aristocracy",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-ari-1", label: "+5 Intellect or Charisma", type: "choice", options: [
        { label: "+5 Intellect",  modifiers: [{ kind: "stat", key: "int", value:  5 }] },
        { label: "+5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value:  5 }] }
      ]},
      { id: "up-ari-2", label: "-5 Leadership or Agility", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Agility",    modifiers: [{ kind: "stat", key: "agi", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Commoner",
    allowedEnvironments: [],
    modifierGroups: []
  },
  {
    name: "Farmer",
    allowedEnvironments: ["town", "country"],
    modifierGroups: [
      { id: "up-far-1", label: "+3 Strength or Agility", type: "choice", options: [
        { label: "+3 Strength", modifiers: [{ kind: "stat", key: "str", value:  3 }] },
        { label: "+3 Agility",  modifiers: [{ kind: "stat", key: "agi", value:  3 }] }
      ]},
      { id: "up-far-2", label: "-3 Charisma or Courage", type: "choice", options: [
        { label: "-3 Charisma", modifiers: [{ kind: "stat", key: "cha", value: -3 }] },
        { label: "-3 Courage",  modifiers: [{ kind: "stat", key: "crg", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Fugitive",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-fug-1", label: "+3 Strength and +3 Toughness; -3 Leadership and -3 Charisma", type: "fixed", options: [
        { label: "+3 STR, +3 TOU, -3 LDR, -3 CHA", modifiers: [
          { kind: "stat", key: "str", value:  3 },
          { kind: "stat", key: "tou", value:  3 },
          { kind: "stat", key: "ldr", value: -3 },
          { kind: "stat", key: "cha", value: -3 }
        ]}
      ]}
    ]
  },
  {
    name: "Laborer",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-lab-1", label: "+2 STR and +1 TOU  OR  +1 STR and +2 TOU", type: "choice", options: [
        { label: "+2 STR, +1 TOU", modifiers: [{ kind: "stat", key: "str", value: 2 }, { kind: "stat", key: "tou", value: 1 }] },
        { label: "+1 STR, +2 TOU", modifiers: [{ kind: "stat", key: "str", value: 1 }, { kind: "stat", key: "tou", value: 2 }] }
      ]},
      { id: "up-lab-2", label: "-3 Courage or Leadership", type: "choice", options: [
        { label: "-3 Courage",    modifiers: [{ kind: "stat", key: "crg", value: -3 }] },
        { label: "-3 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Military",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-mil-1", label: "+3 Leadership or Courage", type: "choice", options: [
        { label: "+3 Leadership", modifiers: [{ kind: "stat", key: "ldr", value:  3 }] },
        { label: "+3 Courage",    modifiers: [{ kind: "stat", key: "crg", value:  3 }] }
      ]},
      { id: "up-mil-2", label: "-3 Charisma or Intellect", type: "choice", options: [
        { label: "-3 Charisma",  modifiers: [{ kind: "stat", key: "cha", value: -3 }] },
        { label: "-3 Intellect", modifiers: [{ kind: "stat", key: "int", value: -3 }] }
      ]}
    ]
  },
  {
    name: "Nobility",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-nob-1", label: "+5 Charisma, +5 Leadership; -5 Perception, -5 Toughness", type: "fixed", options: [
        { label: "+5 CHA, +5 LDR, -5 PER, -5 TOU", modifiers: [
          { kind: "stat", key: "cha", value:  5 },
          { kind: "stat", key: "ldr", value:  5 },
          { kind: "stat", key: "per", value: -5 },
          { kind: "stat", key: "tou", value: -5 }
        ]}
      ]}
    ]
  },
  {
    name: "Street Urchin",
    allowedEnvironments: ["town", "city"],
    modifierGroups: [
      { id: "up-stu-1", label: "Gain +2 Wounds", type: "fixed", options: [
        { label: "+2 Wounds", modifiers: [{ kind: "wound", value: 2 }] }
      ]},
      { id: "up-stu-2", label: "-1 Intellect or Strength", type: "choice", options: [
        { label: "-1 Intellect", modifiers: [{ kind: "stat", key: "int", value: -1 }] },
        { label: "-1 Strength",  modifiers: [{ kind: "stat", key: "str", value: -1 }] }
      ]}
    ]
  },
  {
    name: "War Orphan",
    allowedEnvironments: [],
    modifierGroups: [
      { id: "up-war-1", label: "+5 Courage or Strength", type: "choice", options: [
        { label: "+5 Courage",   modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Strength",  modifiers: [{ kind: "stat", key: "str", value:  5 }] }
      ]},
      { id: "up-war-2", label: "-5 Leadership or Charisma", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Wastelander",
    allowedEnvironments: ["forest", "wasteland"],
    modifierGroups: [
      { id: "up-was-1", label: "+5 Toughness or Perception", type: "choice", options: [
        { label: "+5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "up-was-2", label: "-5 Leadership or Intellect", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] }
      ]}
    ]
  }
];

// ── Environment definitions ────────────────────────────────────────────────────

export const MYTHIC_ENVIRONMENT_DEFINITIONS = [
  {
    name: "City",
    modifierGroups: [
      { id: "env-cty-1", label: "+5 Agility, Courage, or Perception", type: "choice", options: [
        { label: "+5 Agility",    modifiers: [{ kind: "stat", key: "agi", value:  5 }] },
        { label: "+5 Courage",    modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "env-cty-2", label: "-5 Strength, Toughness, or Perception", type: "choice", options: [
        { label: "-5 Strength",   modifiers: [{ kind: "stat", key: "str", value: -5 }] },
        { label: "-5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value: -5 }] },
        { label: "-5 Perception", modifiers: [{ kind: "stat", key: "per", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Country",
    modifierGroups: [
      { id: "env-cou-1", label: "+5 Perception, Agility, or Strength", type: "choice", options: [
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] },
        { label: "+5 Agility",    modifiers: [{ kind: "stat", key: "agi", value:  5 }] },
        { label: "+5 Strength",   modifiers: [{ kind: "stat", key: "str", value:  5 }] }
      ]},
      { id: "env-cou-2", label: "-5 Charisma, Intellect, or Perception", type: "choice", options: [
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Perception", modifiers: [{ kind: "stat", key: "per", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Forest/Jungle",
    modifierGroups: [
      { id: "env-for-1", label: "+5 Perception, Strength, or Toughness", type: "choice", options: [
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] },
        { label: "+5 Strength",   modifiers: [{ kind: "stat", key: "str", value:  5 }] },
        { label: "+5 Toughness",  modifiers: [{ kind: "stat", key: "tou", value:  5 }] }
      ]},
      { id: "env-for-2", label: "-5 Leadership, Intellect, or Charisma", type: "choice", options: [
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Intellect",  modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Town",
    modifierGroups: [
      { id: "env-twn-1", label: "+5 Charisma, Leadership, or Perception", type: "choice", options: [
        { label: "+5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value:  5 }] },
        { label: "+5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value:  5 }] },
        { label: "+5 Perception", modifiers: [{ kind: "stat", key: "per", value:  5 }] }
      ]},
      { id: "env-twn-2", label: "-5 Courage, Intellect, or Agility", type: "choice", options: [
        { label: "-5 Courage",   modifiers: [{ kind: "stat", key: "crg", value: -5 }] },
        { label: "-5 Intellect", modifiers: [{ kind: "stat", key: "int", value: -5 }] },
        { label: "-5 Agility",   modifiers: [{ kind: "stat", key: "agi", value: -5 }] }
      ]}
    ]
  },
  {
    name: "Wasteland",
    modifierGroups: [
      { id: "env-wst-1", label: "+5 Courage, Toughness, or Agility", type: "choice", options: [
        { label: "+5 Courage",   modifiers: [{ kind: "stat", key: "crg", value:  5 }] },
        { label: "+5 Toughness", modifiers: [{ kind: "stat", key: "tou", value:  5 }] },
        { label: "+5 Agility",   modifiers: [{ kind: "stat", key: "agi", value:  5 }] }
      ]},
      { id: "env-wst-2", label: "-5 Charisma, Leadership, or Strength", type: "choice", options: [
        { label: "-5 Charisma",   modifiers: [{ kind: "stat", key: "cha", value: -5 }] },
        { label: "-5 Leadership", modifiers: [{ kind: "stat", key: "ldr", value: -5 }] },
        { label: "-5 Strength",   modifiers: [{ kind: "stat", key: "str", value: -5 }] }
      ]}
    ]
  }
];

// ── Lifestyle definitions ──────────────────────────────────────────────────────
// choiceGroups within a variant = sub-choices the player must make (e.g. which WF characteristic).

export const MYTHIC_LIFESTYLE_DEFINITIONS = [
  {
    name: "Body Builder",
    variants: [
      { id: "bb-v1", rollMin: 1,  rollMax: 5,  label: "You worked out more than anything.",           modifiers: [{ kind:"stat",key:"str",value:3},{kind:"stat",key:"tou",value:3},{kind:"stat",key:"int",value:-3},{kind:"stat",key:"per",value:-3}], choiceGroups: [] },
      { id: "bb-v2", rollMin: 6,  rollMax: 10, label: "You worked out alone a lot.",                  modifiers: [{ kind:"stat",key:"tou",value:3},{kind:"stat",key:"str",value:3},{kind:"stat",key:"cha",value:-3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Fast Talker",
    variants: [
      { id: "ft-v1", rollMin: 1, rollMax: 5,  label: "You have learned the ways of getting what you want.", modifiers: [{ kind:"stat",key:"cha",value:2},{kind:"stat",key:"ldr",value:2},{kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:-2}], choiceGroups: [] },
      { id: "ft-v2", rollMin: 6, rollMax: 9,  label: "You've learned to talk your way out of situations.",  modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] },
      { id: "ft-v3", rollMin: 10,rollMax: 10, label: "You're better at talking than you are at listening.", modifiers: [{ kind:"stat",key:"cha",value:5},{kind:"stat",key:"per",value:-5}], choiceGroups: [] }
    ]
  },
  {
    name: "Gamer or Gambler",
    variants: [
      { id: "gg-v1", rollMin: 1, rollMax: 5,  label: "You've gamed for a hobby.",                     modifiers: [{ kind:"stat",key:"per",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] },
      { id: "gg-v2", rollMin: 6, rollMax: 10, label: "You play games with others for a living.",      modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"str",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Hunter",
    variants: [
      { id: "hun-v1", rollMin: 1, rollMax: 5,  label: "You've hunted for a living. +3 to chosen Warfare Characteristic.",  modifiers: [{ kind:"stat",key:"int",value:-3}], choiceGroups: [
        { id: "hun-v1-wf", label: "+3 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "+3 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:3}] },
          { label: "+3 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:3}] }
        ]}
      ]},
      { id: "hun-v2", rollMin: 6, rollMax: 10, label: "You've hunted for sport. +3 to chosen Warfare Characteristic.", modifiers: [{ kind:"stat",key:"crg",value:-3}], choiceGroups: [
        { id: "hun-v2-wf", label: "+3 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "+3 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:3}] },
          { label: "+3 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:3}] }
        ]}
      ]}
    ]
  },
  {
    name: "Loner",
    variants: [
      { id: "lon-v1", rollMin: 1, rollMax: 5,  label: "You isolate yourself, learning you can only depend on your own actions.", modifiers: [{ kind:"stat",key:"cha",value:-3},{kind:"stat",key:"int",value:3}], choiceGroups: [] },
      { id: "lon-v2", rollMin: 6, rollMax: 10, label: "You've become distrustful of others; you look out for yourself.",       modifiers: [{ kind:"stat",key:"cha",value:-3},{kind:"stat",key:"per",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Mercenary",
    variants: [
      { id: "mer-v1", rollMin: 1, rollMax: 3,  label: "You ran a Mercenary Team that took jobs for cash.",          modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"cha",value:-3}], choiceGroups: [] },
      { id: "mer-v2", rollMin: 4, rollMax: 10, label: "You were a member of a Mercenary Team, which took jobs for cash.", modifiers: [{ kind:"stat",key:"ldr",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Merchant",
    variants: [
      { id: "mrc-v1", rollMin: 1, rollMax: 4,  label: "You sold goods, using quick wit to talk people into sales.", modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] },
      { id: "mrc-v2", rollMin: 5, rollMax: 10, label: "You ran a standard business of buying and selling.",        modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"cha",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Patient",
    variants: [
      { id: "pat-v1", rollMin: 1,  rollMax: 6,  label: "You expect things to come to you, sometimes they do.",        modifiers: [{ kind:"stat",key:"per",value:2},{kind:"stat",key:"cha",value:-2}], choiceGroups: [] },
      { id: "pat-v2", rollMin: 7,  rollMax: 9,  label: "Patience has taught you a lot.",                              modifiers: [{ kind:"stat",key:"int",value:3},{kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:-1}], choiceGroups: [] },
      { id: "pat-v3", rollMin: 10, rollMax: 10, label: "You've learnt to deal with people through Patience.",         modifiers: [{ kind:"stat",key:"cha",value:3},{kind:"wound",value:-4}], choiceGroups: [] }
    ]
  },
  {
    name: "Spiritual",
    variants: [
      { id: "spi-v1", rollMin: 1, rollMax: 5,  label: "You've grown with religion as a major impactor of your life.", modifiers: [{ kind:"stat",key:"str",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] },
      { id: "spi-v2", rollMin: 6, rollMax: 10, label: "You've taken religion as a way of helping others.",            modifiers: [{ kind:"stat",key:"ldr",value:3},{kind:"stat",key:"tou",value:-3}], choiceGroups: [] }
    ]
  },
  {
    name: "Street Fighter",
    variants: [
      { id: "sf-v1", rollMin: 1, rollMax: 4,  label: "You win most of your fights.",  modifiers: [{ kind:"stat",key:"str",value:2},{kind:"stat",key:"tou",value:-2}], choiceGroups: [] },
      { id: "sf-v2", rollMin: 5, rollMax: 8,  label: "You lose most of your fights.", modifiers: [{ kind:"stat",key:"str",value:-2},{kind:"stat",key:"tou",value:2}], choiceGroups: [] },
      { id: "sf-v3", rollMin: 9, rollMax: 10, label: "Balanced fighter.",             modifiers: [{ kind:"stat",key:"str",value:1},{kind:"stat",key:"tou",value:1},{kind:"stat",key:"ldr",value:-2}], choiceGroups: [] }
    ]
  },
  {
    name: "Wanderer",
    variants: [
      { id: "wan-v1", rollMin: 1, rollMax: 5,  label: "You've spent a lot of time running.", modifiers: [{ kind:"stat",key:"agi",value:3},{kind:"stat",key:"crg",value:-3}], choiceGroups: [] },
      { id: "wan-v2", rollMin: 6, rollMax: 10, label: "You've faced your fears.",            modifiers: [{ kind:"stat",key:"agi",value:-3},{kind:"stat",key:"crg",value:3}], choiceGroups: [] }
    ]
  },
  {
    name: "Weapon Training",
    variants: [
      { id: "wt-v1", rollMin: 1, rollMax: 5,  label: "You've learned to use weapons over anything else. +5 to selected Warfare, -5 to the other.", modifiers: [], choiceGroups: [
        { id: "wt-v1-wf", label: "+5 to selected Warfare Characteristic, -5 to the other", type: "choice", options: [
          { label: "+5 WFM, -5 WFR", modifiers: [{ kind:"stat",key:"wfm",value:5},{kind:"stat",key:"wfr",value:-5}] },
          { label: "+5 WFR, -5 WFM", modifiers: [{ kind:"stat",key:"wfr",value:5},{kind:"stat",key:"wfm",value:-5}] }
        ]}
      ]},
      { id: "wt-v2", rollMin: 6, rollMax: 10, label: "You care more about weapons than anything. +5 to selected Warfare, -5 Charisma.", modifiers: [{ kind:"stat",key:"cha",value:-5}], choiceGroups: [
        { id: "wt-v2-wf", label: "+5 to selected Warfare Characteristic", type: "choice", options: [
          { label: "+5 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:5}] },
          { label: "+5 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:5}] }
        ]}
      ]}
    ]
  },
  {
    name: "Wild",
    variants: [
      { id: "wld-v1", rollMin: 1,  rollMax: 5,  label: "Took too many risks, taken many falls.",         modifiers: [{ kind:"stat",key:"str",value:-4},{kind:"stat",key:"tou",value:4}], choiceGroups: [] },
      { id: "wld-v2", rollMin: 6,  rollMax: 9,  label: "Taken beatings, toughened up.",                   modifiers: [{ kind:"wound",value:2},{kind:"stat",key:"tou",value:-3}], choiceGroups: [] },
      { id: "wld-v3", rollMin: 10, rollMax: 10, label: "Rushed through life and tough situations.",       modifiers: [{ kind:"stat",key:"agi",value:2},{kind:"stat",key:"per",value:-2}], choiceGroups: [] }
    ]
  },
  {
    name: "Wise Guy",
    variants: [
      { id: "wg-v1", rollMin: 1, rollMax: 4,  label: "You've taken to reading and use it to show up others.",                  modifiers: [{ kind:"stat",key:"int",value:3},{kind:"stat",key:"ldr",value:-3}], choiceGroups: [] },
      { id: "wg-v2", rollMin: 5, rollMax: 9,  label: "Instead of talking your way out, you attempt to use your knowledge.",    modifiers: [{ kind:"stat",key:"int",value:2},{kind:"stat",key:"cha",value:-2}], choiceGroups: [] },
      { id: "wg-v3", rollMin: 10,rollMax: 10, label: "You prefer more interesting ways of combat. +5 INT, -5 chosen Warfare.", modifiers: [{ kind:"stat",key:"int",value:5}], choiceGroups: [
        { id: "wg-v3-wf", label: "-5 to chosen Warfare Characteristic", type: "choice", options: [
          { label: "-5 Warfare Melee",  modifiers: [{ kind:"stat",key:"wfm",value:-5}] },
          { label: "-5 Warfare Ranged", modifiers: [{ kind:"stat",key:"wfr",value:-5}] }
        ]}
      ]}
    ]
  }
];
