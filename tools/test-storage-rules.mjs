import assert from "node:assert/strict";
import {
  deriveMythicStorageProfile,
  normalizeMythicMagazineData,
  normalizeMythicStorageData,
  parseAmmoCapacityFromText,
  parseCapacityUnitsFromText,
  parseMountRestrictionFromText
} from "../scripts/reference/mythic-storage-rules.mjs";

assert.equal(parseCapacityUnitsFromText("Carries 3 Units."), 3);
assert.equal(parseCapacityUnitsFromText("Capable of carrying up to 6 Units."), 6);
assert.equal(parseCapacityUnitsFromText("Able to carry 5 Magazines, Grenades, and Clips."), 5);
assert.equal(parseAmmoCapacityFromText("32-round magazine"), 32);
assert.equal(parseAmmoCapacityFromText("capacity of 12 rounds"), 12);

const pouchMount = parseMountRestrictionFromText("Must be mounted to a Utility Webbing and Magnetic Webbing.");
assert.deepEqual(pouchMount.requiresParentContainerTypes, ["utility-webbing", "magnetic-webbing", "webbing"]);
assert.equal(pouchMount.requiresParentMode, "all");

const pouch = normalizeMythicStorageData({}, {
  equipmentType: "container",
  description: "Ammunition pouch. Carries 3 Units. Must be mounted to a Utility Webbing and Magnetic Webbing."
}, "Pouch");
assert.equal(pouch.isContainer, true);
assert.equal(pouch.containerType, "pouch");
assert.equal(pouch.capacityUnits, 3);
assert.equal(pouch.acceptedContentRules.requiresMountedState, true);

const impliedPouch = normalizeMythicStorageData({}, {
  equipmentType: "container",
  description: "Able to carry 5 Magazines, Grenades, and Clips."
}, "Equipment Pouch");
assert.equal(impliedPouch.containerType, "pouch");
assert.equal(impliedPouch.acceptedContentRules.requiresMountedState, true);
assert.deepEqual(impliedPouch.mountRules.requiresParentContainerTypes, ["utility-webbing", "magnetic-webbing", "webbing"]);

const pack = normalizeMythicStorageData({}, {
  equipmentType: "container",
  description: "Halves all weight of the items inside when properly worn. Carries 32 Units."
}, "Extended Deployment Pack");
assert.equal(pack.containerType, "backpack");
assert.equal(pack.capacityUnits, 32);
assert.equal(pack.weightModifierMode, "halveContentsWeightWhenWorn");

const magazineProfile = deriveMythicStorageProfile({ equipmentType: "general" }, "32-round Extended Magazine");
assert.equal(magazineProfile.isMagazine, true);
assert.equal(magazineProfile.isContainer, true);
assert.equal(magazineProfile.storageUnits, 2);
assert.equal(magazineProfile.storageUnitsRuleKey, "magazine-extended");
assert.equal(magazineProfile.ammoCapacity, 32);

function assertUnits(name, systemData, expectedUnits, expectedRuleKey) {
  const profile = deriveMythicStorageProfile(systemData, name);
  assert.equal(profile.storageUnits, expectedUnits, name);
  assert.equal(profile.storageUnitsRuleKey, expectedRuleKey, name);
}

assertUnits("M6 Sidearm", { equipmentType: "ranged-weapon", category: "Pistol", weaponTagKeys: ["[OH]"] }, 3, "weapon-oh");
assert.equal(deriveMythicStorageProfile({ equipmentType: "ranged-weapon", category: "Pistol", weaponTagKeys: ["[OH]"] }, "M6 Sidearm").storageCategory, "sidearm");
assertUnits("Underbarrel Shotgun", { equipmentType: "ranged-weapon", category: "Shotgun", weaponTagKeys: ["[TH]"] }, 8, "weapon-th");
assertUnits("M247 Heavy Machine Gun", { equipmentType: "ranged-weapon", category: "Heavy Machine Gun", weaponTagKeys: ["[HW]"] }, 12, "weapon-hw");
assertUnits("Extended Magazine", { equipmentType: "general" }, 2, "magazine-extended");
assertUnits("Drum Magazine", { equipmentType: "general" }, 2, "magazine-drum");
assertUnits("UNSC Battery", { equipmentType: "general" }, 1, "battery-unsc-plasma");
assertUnits("Fuel Tank", { equipmentType: "general" }, 9, "fuel-tank");
assertUnits("Heavy Fuel Tank", { equipmentType: "general" }, 18, "fuel-tank-heavy");
assertUnits("50 round Belt", { equipmentType: "general" }, 2, "ammo-belt-50");
assertUnits("100 round Belt", { equipmentType: "general" }, 3, "ammo-belt-100");
assertUnits("150 round Belt", { equipmentType: "general" }, 4, "ammo-belt-150");
assertUnits("200 round Belt", { equipmentType: "general" }, 5, "ammo-belt-200");
assertUnits("250 round Belt", { equipmentType: "general" }, 6, "ammo-belt-250");
assertUnits("300 round Belt", { equipmentType: "general" }, 7, "ammo-belt-300");
assertUnits("400 round Belt", { equipmentType: "general" }, 8, "ammo-belt-400");
assertUnits("Medical Kit", { equipmentType: "general", category: "Medical" }, 3, "medical-kit");
assertUnits("Biomedical Foam Canister (Biofoam)", { equipmentType: "general", category: "Medical" }, 2, "biofoam-sealant-mesh");
assertUnits("Sealant Mesh", { equipmentType: "general", category: "Medical" }, 2, "biofoam-sealant-mesh");
assertUnits("MRE", { equipmentType: "general" }, 2, "mre");
assertUnits("S90 Gas Mask", { equipmentType: "general" }, 3, "gas-mask");
assertUnits("Regenerator", { equipmentType: "general" }, 9, "regenerator");
assertUnits("Bubble Shield", { equipmentType: "general" }, 8, "bubble-shield");
assertUnits("Flashlight", { equipmentType: "general" }, 1, "flashlight");
assertUnits("Helmet", { equipmentType: "general" }, 5, "helmet");
assertUnits("Utility Webbing", { equipmentType: "container" }, 1, "bandolier-sling-webbing");

assertUnits("Medigel", { equipmentType: "general" }, 1, "");
assertUnits("Rope", { equipmentType: "general" }, 1, "");
assertUnits("Handheld Device", { equipmentType: "general" }, 1, "");

const ammoBeltProfile = deriveMythicStorageProfile({ equipmentType: "general" }, "50 round Belt");
assert.equal(ammoBeltProfile.isContainer, true);
assert.equal(ammoBeltProfile.containerType, "ammo-belt");

const migratedAuto = normalizeMythicStorageData({ storageUnits: 1 }, { equipmentType: "general" }, "Medical Kit");
assert.equal(migratedAuto.storageUnitsSource, "auto");
assert.equal(migratedAuto.storageUnits, 3);
assert.equal(migratedAuto.storageUnitsRuleKey, "medical-kit");

const migratedManual = normalizeMythicStorageData({ storageUnits: 4 }, { equipmentType: "general" }, "Medical Kit");
assert.equal(migratedManual.storageUnitsSource, "manual");
assert.equal(migratedManual.storageUnits, 4);
assert.equal(migratedManual.storageUnitsRuleKey, "");

const explicitManual = normalizeMythicStorageData({ storageUnits: 2, storageUnitsSource: "manual" }, { equipmentType: "general" }, "Medical Kit");
assert.equal(explicitManual.storageUnitsSource, "manual");
assert.equal(explicitManual.storageUnits, 2);

const resetAuto = normalizeMythicStorageData({ storageUnits: 2, storageUnitsSource: "auto" }, { equipmentType: "general" }, "Medical Kit");
assert.equal(resetAuto.storageUnitsSource, "auto");
assert.equal(resetAuto.storageUnits, 3);
assert.equal(resetAuto.storageUnitsRuleKey, "medical-kit");

const magazineStorage = normalizeMythicStorageData({}, {
  equipmentType: "general",
  magazine: { ammoCapacity: 32 }
}, "Magazine");
const magazine = normalizeMythicMagazineData({
  ammoCapacity: 32,
  loadedRounds: [
    { ammoTypeKey: "tracer", label: "Tracer" },
    { ammoTypeKey: "standard", label: "Standard" }
  ]
}, magazineStorage, { equipmentType: "general" }, "Magazine");
assert.equal(magazine.ammoCapacity, 32);
assert.equal(magazine.loadedRounds.length, 2);
assert.equal(magazine.loadedRounds[0].ammoTypeKey, "tracer");

console.log("storage rules smoke tests passed");
