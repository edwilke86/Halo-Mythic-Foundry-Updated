function toNonNegativeNumber(value, fallback = 0) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return Math.max(0, Number(fallback) || 0);
  return Math.max(0, numeric);
}

function toNonNegativeWhole(value, fallback = 0) {
  return Math.max(0, Math.floor(toNonNegativeNumber(value, fallback)));
}

const SPLATTER_HIT_LOCATION_TABLE = (() => {
  const table = {};
  for (let roll = 1; roll <= 2; roll += 1) table[roll] = { zone: "Head", subZone: "Neck", drKey: "head" };
  for (let roll = 3; roll <= 4; roll += 1) table[roll] = { zone: "Head", subZone: "Mouth", drKey: "head" };
  for (let roll = 5; roll <= 6; roll += 1) table[roll] = { zone: "Head", subZone: "Nose", drKey: "head" };
  table[7] = { zone: "Head", subZone: "Eyes", drKey: "head" };
  table[8] = { zone: "Head", subZone: "Ear", drKey: "head" };
  for (let roll = 9; roll <= 10; roll += 1) table[roll] = { zone: "Head", subZone: "Forehead", drKey: "head" };

  for (let roll = 11; roll <= 12; roll += 1) table[roll] = { zone: "Left Arm", subZone: "Hands", drKey: "lArm" };
  for (let roll = 13; roll <= 15; roll += 1) table[roll] = { zone: "Left Arm", subZone: "Forearm", drKey: "lArm" };
  table[16] = { zone: "Left Arm", subZone: "Elbow", drKey: "lArm" };
  for (let roll = 17; roll <= 19; roll += 1) table[roll] = { zone: "Left Arm", subZone: "Bicep", drKey: "lArm" };
  table[20] = { zone: "Left Arm", subZone: "Shoulder", drKey: "lArm" };

  for (let roll = 21; roll <= 22; roll += 1) table[roll] = { zone: "Right Arm", subZone: "Hands", drKey: "rArm" };
  for (let roll = 23; roll <= 25; roll += 1) table[roll] = { zone: "Right Arm", subZone: "Forearm", drKey: "rArm" };
  table[26] = { zone: "Right Arm", subZone: "Elbow", drKey: "rArm" };
  for (let roll = 27; roll <= 29; roll += 1) table[roll] = { zone: "Right Arm", subZone: "Bicep", drKey: "rArm" };
  table[30] = { zone: "Right Arm", subZone: "Shoulder", drKey: "rArm" };

  for (let roll = 31; roll <= 32; roll += 1) table[roll] = { zone: "Left Leg", subZone: "Foot", drKey: "lLeg" };
  for (let roll = 33; roll <= 37; roll += 1) table[roll] = { zone: "Left Leg", subZone: "Shin", drKey: "lLeg" };
  table[38] = { zone: "Left Leg", subZone: "Knee", drKey: "lLeg" };
  for (let roll = 39; roll <= 43; roll += 1) table[roll] = { zone: "Left Leg", subZone: "Thigh", drKey: "lLeg" };
  for (let roll = 44; roll <= 45; roll += 1) table[roll] = { zone: "Left Leg", subZone: "Hip", drKey: "lLeg" };

  for (let roll = 46; roll <= 47; roll += 1) table[roll] = { zone: "Right Leg", subZone: "Foot", drKey: "rLeg" };
  for (let roll = 48; roll <= 53; roll += 1) table[roll] = { zone: "Right Leg", subZone: "Shin", drKey: "rLeg" };
  table[54] = { zone: "Right Leg", subZone: "Knee", drKey: "rLeg" };
  for (let roll = 55; roll <= 58; roll += 1) table[roll] = { zone: "Right Leg", subZone: "Thigh", drKey: "rLeg" };
  for (let roll = 59; roll <= 60; roll += 1) table[roll] = { zone: "Right Leg", subZone: "Hip", drKey: "rLeg" };

  for (let roll = 61; roll <= 65; roll += 1) table[roll] = { zone: "Chest", subZone: "Pelvis", drKey: "chest" };
  for (let roll = 66; roll <= 72; roll += 1) table[roll] = { zone: "Chest", subZone: "Intestines", drKey: "chest" };
  for (let roll = 73; roll <= 78; roll += 1) table[roll] = { zone: "Chest", subZone: "Spine", drKey: "chest" };
  for (let roll = 79; roll <= 84; roll += 1) table[roll] = { zone: "Chest", subZone: "Stomach, Kidney, or Liver", drKey: "chest" };
  for (let roll = 85; roll <= 89; roll += 1) table[roll] = { zone: "Chest", subZone: "Heart", drKey: "chest" };
  for (let roll = 90; roll <= 96; roll += 1) table[roll] = { zone: "Chest", subZone: "Lungs", drKey: "chest" };
  for (let roll = 97; roll <= 100; roll += 1) table[roll] = { zone: "Chest", subZone: "Ribcage (no organ)", drKey: "chest" };
  return Object.freeze(table);
})();

export function formatVehicleHazardNumber(value, digits = 2) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  const precision = Math.max(0, Math.min(6, Math.floor(Number(digits ?? 2))));
  return numeric.toFixed(precision).replace(/\.?0+$/u, "");
}

export function calculateVehicleWreck(inputs = {}) {
  const vehicleSpeed = toNonNegativeWhole(inputs.vehicleSpeed, 0);
  const secondVehicleSpeed = toNonNegativeWhole(inputs.secondVehicleSpeed, 0);
  const collisionType = String(inputs.collisionType ?? "normal").trim().toLowerCase() === "head-on"
    ? "head-on"
    : "normal";
  const collisionTypeLabel = collisionType === "head-on" ? "Head-On Collision" : "Normal Collision";
  const collisionSpeed = collisionType === "head-on" ? vehicleSpeed + secondVehicleSpeed : vehicleSpeed;
  const vehicleWeightTonnes = toNonNegativeNumber(inputs.vehicleWeightTonnes, 0);
  const pilotTestResult = String(inputs.pilotTestResult ?? "failed").trim().toLowerCase() === "success"
    ? "success"
    : "failed";
  const degreesOfSuccess = pilotTestResult === "success" ? toNonNegativeWhole(inputs.degreesOfSuccess, 0) : 0;
  const crewRestrained = Boolean(inputs.crewRestrained);
  const openTop = Boolean(inputs.openTop);

  const baseWreckDice = Math.max(0, Math.floor(collisionSpeed / 20));
  const baseRolls = baseWreckDice;
  const weightReduction = Math.floor(vehicleWeightTonnes / 2);
  const afterWeightReduction = baseRolls - weightReduction;
  const afterWeightMinimum = Math.max(1, afterWeightReduction);
  const pilotReduction = pilotTestResult === "success" ? 1 + degreesOfSuccess : 0;
  const afterPilotReduction = afterWeightMinimum - pilotReduction;
  const totalRolls = Math.max(1, afterPilotReduction);
  const rollingDamageDice = Math.max(1, Math.ceil((totalRolls / 2) / 2));

  return {
    kind: "wreck",
    vehicleSpeed,
    secondVehicleSpeed,
    collisionType,
    collisionTypeLabel,
    collisionSpeed,
    vehicleWeightTonnes,
    pilotTestResult,
    pilotSucceeded: pilotTestResult === "success",
    degreesOfSuccess,
    crewRestrained,
    openTop,
    baseWreckDice,
    baseRolls,
    weightReduction,
    afterWeightReduction,
    afterWeightMinimum,
    pilotReduction,
    afterPilotReduction,
    totalRolls,
    rollingDamageDice,
    requiresSpecialDamage: rollingDamageDice > 4
  };
}

export function calculateVehicleSplatter(inputs = {}) {
  const vehicleSpeed = toNonNegativeWhole(inputs.vehicleSpeed, 0);
  const vehicleWeightTonnes = toNonNegativeNumber(inputs.vehicleWeightTonnes, 0);
  const testPassed = String(inputs.testResult ?? "passed").trim().toLowerCase() === "passed";
  const degreesOfFailure = testPassed ? 0 : toNonNegativeWhole(inputs.degreesOfFailure, 0);
  const speedBand = Math.floor(vehicleSpeed / 20);
  const baseDamageDice = speedBand;
  const hitLocationCount = baseDamageDice > 0 ? Math.max(1, Math.ceil(baseDamageDice / 2)) : 0;

  let outcomeKey = "passed";
  let outcomeLabel = "Target thrown aside";
  let additionalDamageKind = "none";
  let additionalDamageDice = 0;
  let strengthPenalty = null;

  if (!testPassed) {
    if (degreesOfFailure <= 1) {
      outcomeKey = "pinned";
      outcomeLabel = "Pinned";
      additionalDamageKind = "dice";
      additionalDamageDice = 1;
      strengthPenalty = -10 * speedBand;
    } else if (degreesOfFailure === 2) {
      outcomeKey = "thrown-over";
      outcomeLabel = "Thrown over vehicle";
      additionalDamageKind = "dice";
      additionalDamageDice = 2;
    } else {
      outcomeKey = "run-over";
      outcomeLabel = "Run over";
      additionalDamageKind = "weighted";
    }
  }

  return {
    kind: "splatter",
    vehicleSpeed,
    vehicleWeightTonnes,
    speedBand,
    baseDamageDice,
    testPassed,
    degreesOfFailure,
    hitLocationCount,
    outcomeKey,
    outcomeLabel,
    additionalDamageKind,
    additionalDamageDice,
    strengthPenalty
  };
}

export function resolveSplatterHitLocation(rollValue = 1) {
  const roll = Math.max(1, Math.min(100, toNonNegativeWhole(rollValue, 1)));
  return {
    locRoll: roll,
    ...(SPLATTER_HIT_LOCATION_TABLE[roll] ?? { zone: "Chest", subZone: "Ribcage (no organ)", drKey: "chest" })
  };
}

export function getSplatterHitLocationCount(damageDiceCount = 1) {
  return Math.max(1, Math.ceil(toNonNegativeWhole(damageDiceCount, 1) / 2));
}

export function calculateSplatterFollowupOutcome({ vehicleSpeed = 0, vehicleWeightTonnes = 0, dosValue = 0 } = {}) {
  const speed = toNonNegativeWhole(vehicleSpeed, 0);
  const speedBand = Math.floor(speed / 20);
  const weightTonnes = toNonNegativeNumber(vehicleWeightTonnes, 0);
  const degrees = Number(dosValue ?? 0);
  const passed = Number.isFinite(degrees) && degrees >= 0;
  if (passed) {
    return {
      passed: true,
      degreeText: `${Math.max(0, Math.floor(degrees))} DOS`,
      outcomeKey: "thrown-aside",
      outcomeLabel: "Thrown aside",
      extraFormula: "",
      extraDiceCount: 0,
      breakFreePenalty: null
    };
  }

  const degreesOfFailure = Math.max(0, Math.floor(Math.abs(degrees)));
  if (degreesOfFailure <= 1) {
    return {
      passed: false,
      degreeText: `${degreesOfFailure} DOF`,
      outcomeKey: "pinned",
      outcomeLabel: "Pinned",
      extraFormula: "1d10",
      extraDiceCount: 1,
      breakFreePenalty: -10 * speedBand
    };
  }
  if (degreesOfFailure === 2) {
    return {
      passed: false,
      degreeText: "2 DOF",
      outcomeKey: "thrown-over",
      outcomeLabel: "Thrown Over",
      extraFormula: "2d10",
      extraDiceCount: 2,
      breakFreePenalty: null
    };
  }

  const weightDice = Math.max(0, Math.ceil(weightTonnes));
  return {
    passed: false,
    degreeText: `${degreesOfFailure} DOF`,
    outcomeKey: "run-over",
    outcomeLabel: "Run Over",
    extraFormula: weightDice > 0 ? `1d10 + ${weightDice}d10` : "1d10",
    extraDiceCount: 1 + weightDice,
    breakFreePenalty: null,
    weightDice
  };
}
