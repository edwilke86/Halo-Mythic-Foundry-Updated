// Halo Mythic Foundry — Armor-related catalogs

// These are the general armor special rules (not power armor traits).
// Keep keys stable so armor items can store references safely across updates.
export const MYTHIC_ARMOR_SPECIAL_RULE_DEFINITIONS = Object.freeze([
  { key: "biofoam-injector-port", label: "Biofoam Injector Port" },
  { key: "bulky-special-rule", label: "Bulky Special Rule" },
  { key: "communications-unit", label: "Communications Unit" },
  { key: "cryo-resistant", label: "Cryo-Resistant" },
  { key: "demolitions", label: "Demolitions" },
  { key: "fire-rescue", label: "Fire-Rescue" },
  { key: "freefall-assistance-microskeleton", label: "Freefall Assistance Microskeleton" },
  { key: "hybrid-black-surfacing-paneling", label: "Hybrid Black-Surfacing Paneling" },
  { key: "kevlar-undersuit-liquid-nanocrystal", label: "Kevlar Undersuit and Liquid Nanocrystal" },
  { key: "mobility-boosting-exo-lining", label: "Mobility-Boosting Exo-Lining" },
  { key: "photo-reactive-panels", label: "Photo-Reactive Panels" },
  { key: "rucksack", label: "Rucksack" },
  { key: "rucksack-medical-extension", label: "Rucksack Medical Extension" },
  { key: "temperature-regulator", label: "Temperature Regulator" },
  { key: "thermal-cooling", label: "Thermal Cooling" },
  { key: "thermal-dampener", label: "Thermal Dampener" },
  { key: "timeline-special-rule", label: "Timeline Special Rule" },
  { key: "uu-ppe", label: "UU-PPE" },
  { key: "uvh-ba", label: "UVH-BA" },
  { key: "vacuum-sealed", label: "Vacuum Sealed" },
  { key: "visr", label: "VISR" },
  { key: "vr-oxygen-recycler", label: "VR/Oxygen Recycler" }
]);

// These are features specific to Powered and Semi-Powered armor only.
// Keep keys stable so armor items can store references safely across updates.
export const MYTHIC_POWER_ARMOR_TRAIT_DEFINITIONS = Object.freeze([
  { key: "battery-powered", label: "Battery Powered" },
  { key: "onboard-computer", label: "Onboard Computer" },
  { key: "vacuum-oxygen-recycler", label: "Vacuum/Oxygen Recycler" },
  { key: "artificial-muscle-suite", label: "Artificial Muscle Suite" },
  { key: "heads-up-display", label: "Heads-up Display" },
  { key: "biofoam-auto-injector", label: "Biofoam Auto-Injector" },
  { key: "eva-system", label: "EVA System" },
  { key: "improved-motion-tracker", label: "Improved Motion Tracker" },
  { key: "nano-technology", label: "Nano Technology" },
  { key: "reactive-metal-liquid-crystals", label: "Reactive Metal Liquid Crystals" },
  { key: "odst-only", label: "ODST Only" },
  { key: "spartans-only", label: "Spartans Only" },
  { key: "gen-i-variants", label: "GEN I Variants" },
  { key: "gen-ii-variants", label: "GEN II Variants" },
  { key: "gen-iii-variants", label: "GEN III Variants" },
  { key: "self-destruct", label: "Self Destruct" },
  { key: "prototype", label: "Prototype" },
  { key: "spartan-iv-attuning", label: "Spartan IV Attuning" },
  { key: "thruster-pack", label: "Thruster Pack" },
  { key: "ground-pound", label: "Ground Pound" },
  { key: "spartan-charge-thrust-pack", label: "Spartan Charge Thrust Pack" },
  { key: "hover-stabilization", label: "Hover Stabilization" },
  { key: "sprint", label: "Sprint" },
  { key: "system-peril-distributed-reflex", label: "System Peril Distributed Reflex" }
]);

// Flavor-first armor abilities. Mechanical hooks can be added later.
export const MYTHIC_ARMOR_ABILITY_DEFINITIONS = Object.freeze([
  { key: "armor-lock", label: "Armor Lock" },
  { key: "artemis-revival-system", label: "Artemis Revival System" },
  { key: "artemis-tracking-system", label: "Artemis Tracking System" },
  { key: "covenant-anti-gravity-pack", label: "Covenant Anti-Gravity Pack" },
  { key: "covenant-thrust-pack", label: "Covenant Thrust Pack" },
  { key: "drop-shield", label: "Drop Shield" },
  { key: "drop-wall", label: "Drop Wall" },
  { key: "hologram", label: "Hologram" },
  { key: "m805x-forward-acceleration-unit", label: "M805X Forward Acceleration Unit" },
  { key: "regeneration-field", label: "Regeneration Field" },
  { key: "repel", label: "Repel" },
  { key: "series-12-jetpack", label: "Series 12 Jetpack" },
  { key: "series-8-jetpack", label: "Series 8 Jetpack" },
  { key: "slipspace-personal-teleportation-unit", label: "Slipspace Personal Teleportation Unit" },
  { key: "sprint-module", label: "Sprint Module" },
  { key: "t-3-active-camouflage", label: "T-3 Active Camouflage" },
  { key: "thrust-package", label: "Thrust Package" },
  { key: "z2500-automated-protection-drone", label: "Z2500 Automated Protection Drone" },
  { key: "z5080-promethean-vision", label: "Z5080 Promethean Vision" },
  { key: "z-90-photon-hardlight-shield", label: "Z-90 Photon Hardlight Shield" }
]);
