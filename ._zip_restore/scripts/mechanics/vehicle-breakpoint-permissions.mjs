import {
  MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_OPTIONS,
  MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_SETTING_KEY,
  MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_VALUES
} from "../config.mjs";
import { normalizeVehicleSystemData } from "../data/normalization.mjs";

const MYTHIC_SYSTEM_ID = "Halo-Mythic-Foundry-Updated";
const MYTHIC_VEHICLE_BREAKPOINT_SOCKET_TYPE = "vehicleBreakpointUpdate";
const MYTHIC_VEHICLE_CONTROL_SOCKET_TYPE = "vehicleControlUpdate";

const VEHICLE_BREAKPOINT_ROLE_RANKS = Object.freeze({
  passenger: 1,
  gunner: 2,
  operator: 3
});

const VEHICLE_BREAKPOINT_PERMISSION_THRESHOLDS = Object.freeze({
  gmOnly: 0,
  gmOperator: VEHICLE_BREAKPOINT_ROLE_RANKS.operator,
  gmOperatorGunners: VEHICLE_BREAKPOINT_ROLE_RANKS.gunner,
  gmOperatorGunnersPassengers: VEHICLE_BREAKPOINT_ROLE_RANKS.passenger
});

const VEHICLE_BREAKPOINT_CREW_ROLES = Object.freeze([
  Object.freeze({ crewKey: "operators", role: "operator", capacityKey: "operators", rank: VEHICLE_BREAKPOINT_ROLE_RANKS.operator }),
  Object.freeze({ crewKey: "gunners", role: "gunner", capacityKey: "gunners", rank: VEHICLE_BREAKPOINT_ROLE_RANKS.gunner }),
  Object.freeze({ crewKey: "complement", role: "passenger", capacityKey: "passengers", rank: VEHICLE_BREAKPOINT_ROLE_RANKS.passenger })
]);

const NON_GM_ALLOWED_SURFACES = Object.freeze(new Set([
  "characterVehicleTab",
  "tokenHud",
  "vehicleTokenSheet"
]));

function normalizeDocumentType(documentName = "") {
  return String(documentName ?? "").trim().toLowerCase();
}

function isTokenDocument(document = null) {
  return normalizeDocumentType(document?.documentName) === "token";
}

function isActorDocument(document = null) {
  return normalizeDocumentType(document?.documentName) === "actor";
}

function isSupportedTokenOccupantActor(actorDoc = null) {
  return ["character", "bestiary", "npc"].includes(String(actorDoc?.type ?? "").trim().toLowerCase());
}

function isSupportedActorOccupant(actorDoc = null) {
  return String(actorDoc?.type ?? "").trim().toLowerCase() === "character";
}

function unwrapVehicleTokenDocument(resolved = null) {
  if (isTokenDocument(resolved)) return resolved;
  if (isTokenDocument(resolved?.document)) return resolved.document;
  if (isTokenDocument(resolved?.parent)) return resolved.parent;
  if (isTokenDocument(resolved?.document?.parent)) return resolved.document.parent;
  if (isTokenDocument(resolved?.token)) return resolved.token;
  if (isTokenDocument(resolved?.token?.document)) return resolved.token.document;
  return null;
}

function resolveStoredCrewReference(reference = "") {
  const normalized = String(reference ?? "").trim();
  if (!normalized) return null;

  if (typeof globalThis.fromUuidSync === "function") {
    try {
      const resolved = globalThis.fromUuidSync(normalized) ?? null;
      if (resolved) return resolved;
    } catch (_error) {
      // Legacy plain ids are not valid UUIDs; fall through to world actors.
    }
  }

  const actor = game?.actors?.get?.(normalized) ?? null;
  if (actor) return actor;

  for (const scene of Array.from(game?.scenes ?? [])) {
    const token = scene?.tokens?.get?.(normalized)
      ?? Array.from(scene?.tokens ?? []).find((entry) => String(entry?.id ?? entry?._id ?? "").trim() === normalized)
      ?? null;
    if (token) return token;
  }

  return null;
}

function getCrewStoredReference(row = {}) {
  return String(row?.tokenUuid ?? row?.actorUuid ?? row?.id ?? "").trim();
}

function getCrewAssignmentType(row = {}, reference = "") {
  const requested = String(row?.assignmentType ?? row?.referenceType ?? "").trim().toLowerCase();
  if (requested === "token" || requested === "character-actor" || requested === "legacy-actor") return requested;
  if (String(row?.tokenUuid ?? "").trim() || /^Scene\.[^.]+\.Token\.[^.]+/u.test(reference)) return "token";
  if (String(row?.actorUuid ?? "").trim() || /^Actor\.[^.]+$/u.test(reference) || /^Compendium\.[^.]+\.[^.]+\.Actor\.[^.]+$/u.test(reference)) return "character-actor";
  return reference ? "legacy-actor" : "";
}

function resolveCrewSeatOccupant(row = {}) {
  const reference = getCrewStoredReference(row);
  if (!reference) return { isValid: false, reference: "", actorDoc: null, tokenDoc: null };

  const assignmentType = getCrewAssignmentType(row, reference);
  const resolved = resolveStoredCrewReference(reference);
  const tokenDoc = unwrapVehicleTokenDocument(resolved);
  const actorDoc = tokenDoc?.actor ?? (isActorDocument(resolved) ? resolved : (isActorDocument(resolved?.actor) ? resolved.actor : null));

  if (tokenDoc) {
    return {
      isValid: isSupportedTokenOccupantActor(actorDoc),
      reference,
      actorDoc,
      tokenDoc,
      assignmentType: "token"
    };
  }

  return {
    isValid: assignmentType !== "token" && isSupportedActorOccupant(actorDoc),
    reference,
    actorDoc,
    tokenDoc: null,
    assignmentType
  };
}

function getVehicleActorTokenDocument(vehicleActor = null) {
  if (!vehicleActor || typeof vehicleActor !== "object") return null;
  if (isTokenDocument(vehicleActor?.token)) return vehicleActor.token;
  if (isTokenDocument(vehicleActor?.token?.document)) return vehicleActor.token.document;
  if (isTokenDocument(vehicleActor?.parent)) return vehicleActor.parent;
  if (isTokenDocument(vehicleActor?.document?.parent)) return vehicleActor.document.parent;
  return null;
}

export function getVehicleActorReference(vehicleActor = null) {
  if (String(vehicleActor?.type ?? "").trim().toLowerCase() !== "vehicle") return "";
  const actorUuid = String(vehicleActor?.uuid ?? "").trim();
  if (actorUuid && (actorUuid.includes(".Token.") || actorUuid.startsWith("Scene."))) return actorUuid;
  const tokenUuid = String(getVehicleActorTokenDocument(vehicleActor)?.uuid ?? "").trim();
  if (tokenUuid) return tokenUuid;
  if (actorUuid) return actorUuid;
  const actorId = String(vehicleActor?.id ?? vehicleActor?._id ?? "").trim();
  return actorId ? `Actor.${actorId}` : "";
}

export function resolveVehicleActorReference(reference = "") {
  const normalized = String(reference ?? "").trim();
  if (!normalized) return null;

  const directActor = game?.actors?.get?.(normalized) ?? null;
  if (String(directActor?.type ?? "").trim().toLowerCase() === "vehicle") return directActor;

  if (normalized.startsWith("Actor.")) {
    const actorId = normalized.split(".").pop();
    const actor = actorId ? (game?.actors?.get?.(actorId) ?? null) : null;
    if (String(actor?.type ?? "").trim().toLowerCase() === "vehicle") return actor;
  }

  if (typeof globalThis.fromUuidSync === "function") {
    try {
      const resolved = globalThis.fromUuidSync(normalized) ?? null;
      if (String(resolved?.type ?? "").trim().toLowerCase() === "vehicle") return resolved;
      const tokenDoc = unwrapVehicleTokenDocument(resolved);
      if (String(tokenDoc?.actor?.type ?? "").trim().toLowerCase() === "vehicle") return tokenDoc.actor;
      if (String(resolved?.actor?.type ?? "").trim().toLowerCase() === "vehicle") return resolved.actor;
    } catch (_error) {
      return null;
    }
  }

  return null;
}

export function normalizeVehicleBreakpointEditPermission(value = "") {
  const normalized = String(value ?? "").trim();
  return MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_VALUES.includes(normalized) ? normalized : "gmOnly";
}

export function getVehicleBreakpointEditPermissionOptions(selected = "gmOnly") {
  const normalizedSelected = normalizeVehicleBreakpointEditPermission(selected);
  return MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    selected: option.value === normalizedSelected
  }));
}

export function getVehicleBreakpointEditPermissionSetting() {
  const settingKey = `${MYTHIC_SYSTEM_ID}.${MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_SETTING_KEY}`;
  if (!game?.settings?.settings?.has?.(settingKey)) return "gmOnly";

  try {
    return normalizeVehicleBreakpointEditPermission(game.settings.get(MYTHIC_SYSTEM_ID, MYTHIC_VEHICLE_BREAKPOINT_EDIT_PERMISSION_SETTING_KEY));
  } catch (_error) {
    return "gmOnly";
  }
}

function getActorIdentityKeys(actorDoc = null, tokenDoc = null) {
  const keys = new Set();
  const add = (value = "") => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return;
    keys.add(normalized);
    keys.add(normalized.toLowerCase());
    if (!normalized.startsWith("Actor.") && /^[A-Za-z0-9_-]+$/u.test(normalized)) {
      keys.add(`Actor.${normalized}`);
      keys.add(`actor.${normalized.toLowerCase()}`);
    }
  };

  for (const value of [
    actorDoc?.id,
    actorDoc?._id,
    actorDoc?.uuid,
    actorDoc?.id ? `Actor.${actorDoc.id}` : "",
    actorDoc?.baseActor?.id,
    actorDoc?.baseActor?._id,
    actorDoc?.baseActor?.uuid,
    actorDoc?.baseActor?.id ? `Actor.${actorDoc.baseActor.id}` : "",
    tokenDoc?.uuid,
    tokenDoc?.id,
    tokenDoc?._id,
    tokenDoc?.actorId,
    tokenDoc?.actor?.id,
    tokenDoc?.actor?.uuid
  ]) {
    add(value);
  }

  return keys;
}

function doesDocumentMatchUserCharacter(document = null, user = game?.user) {
  const userCharacter = user?.character ?? null;
  if (!document || !userCharacter) return false;

  const documentActor = isTokenDocument(document)
    ? (document.actor ?? null)
    : (isActorDocument(document) ? document : (isActorDocument(document?.actor) ? document.actor : null));
  if (!documentActor) return false;

  const documentKeys = getActorIdentityKeys(documentActor, isTokenDocument(document) ? document : null);
  const characterKeys = getActorIdentityKeys(userCharacter, null);
  for (const key of characterKeys) {
    if (documentKeys.has(key) || documentKeys.has(String(key).toLowerCase())) return true;
  }
  return false;
}

function doesSeatMatchOccupant(seat = null, actorDoc = null, tokenDoc = null) {
  if (!seat || (!actorDoc && !tokenDoc)) return false;
  const requestedTokenUuid = String(tokenDoc?.uuid ?? actorDoc?.token?.uuid ?? "").trim();
  const seatTokenUuid = String(seat?.tokenDoc?.uuid ?? "").trim();
  if (requestedTokenUuid && (requestedTokenUuid === seatTokenUuid || requestedTokenUuid === seat.reference)) return true;

  const actorType = String(actorDoc?.type ?? "").trim().toLowerCase();
  const actorUuid = String(actorDoc?.uuid ?? "").trim();
  if (actorType === "bestiary" && seatTokenUuid && !actorUuid.includes(".Token.")) return false;

  const occupantKeys = getActorIdentityKeys(actorDoc, tokenDoc);
  const seatKeys = getActorIdentityKeys(seat?.actorDoc, seat?.tokenDoc);
  seatKeys.add(String(seat?.reference ?? "").trim());
  seatKeys.add(String(seat?.reference ?? "").trim().toLowerCase());

  for (const key of occupantKeys) {
    if (seatKeys.has(key) || seatKeys.has(String(key).toLowerCase())) return true;
  }
  return false;
}

function doesSeatReferenceMatchOccupant(seat = null, actorDoc = null, tokenDoc = null) {
  if (!seat || (!actorDoc && !tokenDoc)) return false;
  if (doesSeatMatchOccupant(seat, actorDoc, tokenDoc)) return true;

  const seatReferences = [
    seat.reference,
    seat.rawReference,
    seat.tokenUuid,
    seat.actorUuid,
    seat.id
  ].map((entry) => String(entry ?? "").trim()).filter(Boolean);
  if (!seatReferences.length) return false;

  const occupantKeys = getActorIdentityKeys(actorDoc, tokenDoc);
  for (const reference of seatReferences) {
    if (occupantKeys.has(reference) || occupantKeys.has(reference.toLowerCase())) return true;
  }
  return false;
}

function canUserOwnDocument(document = null, user = game?.user) {
  if (!document || !user) return false;
  if (user.isGM) return true;
  if (doesDocumentMatchUserCharacter(document, user)) return true;
  if (typeof document.testUserPermission === "function") {
    try {
      if (document.testUserPermission(user, "OWNER")) return true;
    } catch (_error) {
      // Fall through to ownership data.
    }
  }
  if (user.id === game?.user?.id && document.isOwner === true) return true;

  const ownership = document.ownership ?? document.permission ?? {};
  const ownerLevel = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  const userLevel = Number(ownership?.[user.id] ?? ownership?.default ?? 0);
  return Number.isFinite(userLevel) && userLevel >= ownerLevel;
}

function canUserOwnOccupant(actorDoc = null, tokenDoc = null, user = game?.user) {
  return canUserOwnDocument(actorDoc, user) || canUserOwnDocument(tokenDoc, user);
}

function canUserControlSeatOccupant(seat = null, user = game?.user, requiredSeat = null, requiredOccupantOwned = false) {
  if (!seat) return false;
  return canUserOwnOccupant(seat.actorDoc, seat.tokenDoc, user)
    || Boolean(requiredOccupantOwned && seat === requiredSeat);
}

export function getVehicleCrewSeatEntries(vehicleActor = null, vehicleSystem = null) {
  if (String(vehicleActor?.type ?? "").trim().toLowerCase() !== "vehicle") return [];
  const source = vehicleSystem ? normalizeVehicleSystemData(vehicleSystem) : normalizeVehicleSystemData(vehicleActor.system ?? {});
  const seats = [];

  for (const roleDefinition of VEHICLE_BREAKPOINT_CREW_ROLES) {
    const capacity = Math.max(
      Number(source?.crew?.capacity?.[roleDefinition.capacityKey] ?? 0) || 0,
      Array.isArray(source?.crew?.[roleDefinition.crewKey]) ? source.crew[roleDefinition.crewKey].length : 0
    );
    const rows = Array.isArray(source?.crew?.[roleDefinition.crewKey]) ? source.crew[roleDefinition.crewKey] : [];
    for (let index = 0; index < capacity; index += 1) {
      const row = rows[index] ?? {};
      const reference = getCrewStoredReference(row);
      const resolution = resolveCrewSeatOccupant(row);
      seats.push({
        crewKey: roleDefinition.crewKey,
        role: roleDefinition.role,
        rank: roleDefinition.rank,
        seatKey: `${roleDefinition.crewKey}:${index + 1}`,
        slotIndex: index,
        reference: resolution.reference,
        rawReference: reference,
        id: String(row?.id ?? "").trim(),
        tokenUuid: String(row?.tokenUuid ?? "").trim(),
        actorUuid: String(row?.actorUuid ?? "").trim(),
        isValid: Boolean(resolution.isValid),
        actorDoc: resolution.isValid ? resolution.actorDoc : null,
        tokenDoc: resolution.isValid ? resolution.tokenDoc : null
      });
    }
  }

  return seats;
}

export function resolveVehicleBreakpointEditPermission(vehicleActor = null, options = {}) {
  const user = options.user ?? game?.user ?? null;
  const surface = String(options.surface ?? "").trim();
  const vehicleType = String(vehicleActor?.type ?? "").trim().toLowerCase();
  if (vehicleType !== "vehicle") {
    return { allowed: false, reason: "Vehicle actor is unavailable.", role: "", rank: 0, permission: "gmOnly", surface };
  }

  const vehicleSystem = options.vehicleSystem ? normalizeVehicleSystemData(options.vehicleSystem) : normalizeVehicleSystemData(vehicleActor.system ?? {});
  const permission = getVehicleBreakpointEditPermissionSetting();
  if (user?.isGM) {
    return { allowed: true, reason: "", role: "gm", rank: Infinity, permission, surface };
  }

  if (!NON_GM_ALLOWED_SURFACES.has(surface)) {
    return {
      allowed: false,
      reason: "Only the GM can edit vehicle breakpoints from this sheet.",
      role: "",
      rank: 0,
      permission,
      surface
    };
  }

  const threshold = VEHICLE_BREAKPOINT_PERMISSION_THRESHOLDS[permission] ?? 0;
  if (threshold <= 0) {
    return {
      allowed: false,
      reason: "Vehicle breakpoint editing is configured for GM-only access.",
      role: "",
      rank: 0,
      permission,
      surface
    };
  }

  const seats = getVehicleCrewSeatEntries(vehicleActor, vehicleSystem);
  const requiredActor = options.requireAttachedActor ?? null;
  const requiredToken = options.requireAttachedToken ?? getVehicleActorTokenDocument(requiredActor);
  let requiredSeat = null;
  const requiredOccupantOwned = Boolean((requiredActor || requiredToken) && canUserOwnOccupant(requiredActor, requiredToken, user));
  if (requiredActor || requiredToken) {
    requiredSeat = seats.find((seat) => doesSeatReferenceMatchOccupant(seat, requiredActor, requiredToken)) ?? null;
    if (!requiredSeat) {
      return {
        allowed: false,
        reason: "This actor is no longer attached to the selected vehicle.",
        role: "",
        rank: 0,
        permission,
        surface
      };
    }
  }

  let bestSeat = null;
  for (const seat of seats) {
    if (!seat.isValid && seat !== requiredSeat) continue;
    if (!canUserControlSeatOccupant(seat, user, requiredSeat, requiredOccupantOwned)) continue;
    if (!bestSeat || seat.rank > bestSeat.rank) bestSeat = seat;
  }

  if (!bestSeat) {
    return {
      allowed: false,
      reason: "You do not own an attached occupant on this vehicle.",
      role: "",
      rank: 0,
      permission,
      surface
    };
  }

  const allowed = bestSeat.rank >= threshold;
  return {
    allowed,
    reason: allowed ? "" : "Your attached vehicle role is not allowed to edit breakpoints.",
    role: bestSeat.role,
    rank: bestSeat.rank,
    permission,
    surface
  };
}

export function isVehicleBreakpointCurrentUpdatePath(path = "") {
  const normalized = String(path ?? "").trim();
  if (!normalized.startsWith("system.overview.breakpoints.")) return false;
  if (/(^|\.)(__proto__|prototype|constructor)(\.|$)/u.test(normalized)) return false;
  return normalized === "system.overview.breakpoints.engine.current"
    || normalized === "system.overview.breakpoints.hull.current"
    || /^system\.overview\.breakpoints\.(weapons|optics|mobility)\.byId\.[A-Za-z0-9_-]+\.current$/u.test(normalized)
    || /^system\.overview\.breakpoints\.custom\.\d+\.current$/u.test(normalized);
}

function getConfiguredBaseValue(field = {}) {
  const configuredValue = Math.max(0, Math.round(Number(field?.value ?? 0) || 0));
  const configuredMax = Math.max(0, Math.round(Number(field?.max ?? 0) || 0));
  return configuredValue > 0 || configuredMax <= 0 ? configuredValue : configuredMax;
}

function getVehicleEmplacementControllerSeatKey(emplacement = null) {
  const controllerRole = String(emplacement?.controllerRole ?? "").trim().toLowerCase();
  const controllerIndex = Math.max(0, Math.floor(Number(emplacement?.controllerIndex ?? emplacement?.controllerPosition ?? 0) || 0));
  if (!controllerRole || controllerIndex <= 0) return "";
  const crewKeyByRole = {
    operator: "operators",
    gunner: "gunners",
    passenger: "complement"
  };
  const crewKey = crewKeyByRole[controllerRole] ?? "";
  return crewKey ? `${crewKey}:${controllerIndex}` : "";
}

function resolveUserOwnedSeat(vehicleActor = null, vehicleSystem = null, options = {}) {
  const user = options.user ?? game?.user ?? null;
  if (user?.isGM) return { allowed: true, role: "gm", rank: Infinity, seatKey: "", seat: null, reason: "" };

  const seats = getVehicleCrewSeatEntries(vehicleActor, vehicleSystem);
  const requiredActor = options.requireAttachedActor ?? null;
  const requiredToken = options.requireAttachedToken ?? getVehicleActorTokenDocument(requiredActor);
  const requestedSeatKey = String(options.seatKey ?? "").trim();
  let requiredSeat = null;
  const requiredOccupantOwned = Boolean((requiredActor || requiredToken) && canUserOwnOccupant(requiredActor, requiredToken, user));

  if (requestedSeatKey) {
    const requestedSeat = seats.find((seat) => String(seat?.seatKey ?? "").trim() === requestedSeatKey) ?? null;
    if (!requestedSeat) {
      return { allowed: false, role: "", rank: 0, seatKey: "", seat: null, reason: "Vehicle seat is no longer available." };
    }
    if ((requiredActor || requiredToken) && !doesSeatReferenceMatchOccupant(requestedSeat, requiredActor, requiredToken)) {
      return { allowed: false, role: "", rank: 0, seatKey: "", seat: null, reason: "This actor is no longer attached to the selected vehicle." };
    }
    if (!canUserControlSeatOccupant(requestedSeat, user, requestedSeat, requiredOccupantOwned)) {
      return { allowed: false, role: "", rank: 0, seatKey: "", seat: null, reason: "You do not own the occupant assigned to this vehicle seat." };
    }
    return {
      allowed: true,
      role: requestedSeat.role,
      rank: requestedSeat.rank,
      seatKey: requestedSeat.seatKey,
      seat: requestedSeat,
      reason: ""
    };
  }

  if (requiredActor || requiredToken) {
    requiredSeat = seats.find((seat) => doesSeatReferenceMatchOccupant(seat, requiredActor, requiredToken)) ?? null;
    if (!requiredSeat) {
      return { allowed: false, role: "", rank: 0, seatKey: "", seat: null, reason: "This actor is no longer attached to the selected vehicle." };
    }
  }

  let bestSeat = null;
  for (const seat of seats) {
    if (!seat.isValid && seat !== requiredSeat) continue;
    if (!canUserControlSeatOccupant(seat, user, requiredSeat, requiredOccupantOwned)) continue;
    if (!bestSeat || seat.rank > bestSeat.rank) bestSeat = seat;
  }

  if (!bestSeat) {
    return { allowed: false, role: "", rank: 0, seatKey: "", seat: null, reason: "You do not own an attached occupant on this vehicle." };
  }

  return {
    allowed: true,
    role: bestSeat.role,
    rank: bestSeat.rank,
    seatKey: bestSeat.seatKey,
    seat: bestSeat,
    reason: ""
  };
}

function canSeatControlVehicleWeapon(seat = null, emplacement = null, vehicleSystem = null, controlKind = "weapon") {
  const seatKey = String(seat?.seatKey ?? "").trim();
  const crewKey = String(seat?.crewKey ?? "").trim().toLowerCase();
  if (!seatKey || !emplacement) return false;

  const vehicleHasNeuralLink = Boolean(vehicleSystem?.special?.neuralInterface?.has);
  const normalizedKind = String(controlKind ?? "weapon").trim().toLowerCase();
  if (normalizedKind === "neurallink") {
    return crewKey === "operators" && vehicleHasNeuralLink;
  }

  if (crewKey === "gunners") {
    return getVehicleEmplacementControllerSeatKey(emplacement) === seatKey;
  }
  if (crewKey === "operators" && vehicleHasNeuralLink) {
    return emplacement?.useNeuralLink === true
      && String(emplacement?.neuralLinkOperatorSeatKey ?? "").trim() === seatKey;
  }
  if (crewKey === "operators") {
    return getVehicleEmplacementControllerSeatKey(emplacement) === seatKey;
  }
  return false;
}

function isCrewSlotClearUpdatePath(path = "") {
  return /^system\.crew\.(operators|gunners|complement)$/u.test(String(path ?? "").trim());
}

function getCrewKeyFromUpdatePath(path = "") {
  const match = String(path ?? "").trim().match(/^system\.crew\.(operators|gunners|complement)$/u);
  return match?.[1] ?? "";
}

function isCrewRowReferenceEmpty(row = null) {
  if (!row || typeof row !== "object") return true;
  return !String(row?.tokenUuid ?? "").trim()
    && !String(row?.actorUuid ?? "").trim()
    && !String(row?.id ?? "").trim();
}

function validateVehicleCrewSlotClearUpdate(currentSystem = null, updateData = {}, options = {}) {
  const paths = Object.keys(updateData ?? {});
  if (paths.length !== 1 || !isCrewSlotClearUpdatePath(paths[0])) return false;

  const updatePath = paths[0];
  const crewKey = getCrewKeyFromUpdatePath(updatePath);
  const requestedCrewKey = String(options.crewKey ?? "").trim();
  const rawSlotIndex = Number(options.slotIndex ?? -1);
  const slotIndex = Number.isFinite(rawSlotIndex) ? Math.floor(rawSlotIndex) : -1;
  if (!crewKey || requestedCrewKey !== crewKey || slotIndex < 0) return false;

  const currentRows = Array.isArray(currentSystem?.crew?.[crewKey]) ? currentSystem.crew[crewKey] : [];
  const nextRows = Array.isArray(updateData[updatePath]) ? updateData[updatePath] : null;
  if (!nextRows || slotIndex >= currentRows.length || nextRows.length !== currentRows.length) return false;

  for (let index = 0; index < currentRows.length; index += 1) {
    if (index === slotIndex) continue;
    if (JSON.stringify(currentRows[index] ?? {}) !== JSON.stringify(nextRows[index] ?? {})) return false;
  }

  return !isCrewRowReferenceEmpty(currentRows[slotIndex]) && isCrewRowReferenceEmpty(nextRows[slotIndex]);
}

function serializeComparableVehicleEmplacement(entry = {}) {
  return JSON.stringify({
    id: String(entry?.id ?? "").trim(),
    weaponItemId: String(entry?.weaponItemId ?? "").trim(),
    controllerRole: String(entry?.controllerRole ?? "").trim(),
    controllerIndex: Math.max(0, Math.floor(Number(entry?.controllerIndex ?? entry?.controllerPosition ?? 0) || 0)),
    linked: Boolean(entry?.linked),
    linkedCount: Math.max(1, Math.floor(Number(entry?.linkedCount ?? 1) || 1)),
    location: String(entry?.location ?? "").trim(),
    unavailable: Boolean(entry?.unavailable)
  });
}

function validateVehicleWeaponEmplacementUpdate(currentSystem = null, nextSystem = null, options = {}) {
  const currentEntries = Array.isArray(currentSystem?.weaponEmplacements) ? currentSystem.weaponEmplacements : [];
  const nextEntries = Array.isArray(nextSystem?.weaponEmplacements) ? nextSystem.weaponEmplacements : [];
  if (currentEntries.length !== nextEntries.length) return false;

  const targetId = String(options.emplacementId ?? "").trim();
  if (!targetId) return false;

  const currentById = new Map(currentEntries.map((entry) => [String(entry?.id ?? "").trim(), entry]));
  const nextById = new Map(nextEntries.map((entry) => [String(entry?.id ?? "").trim(), entry]));
  if (!currentById.has(targetId) || !nextById.has(targetId)) return false;

  for (const currentEntry of currentEntries) {
    const id = String(currentEntry?.id ?? "").trim();
    const nextEntry = nextById.get(id);
    if (!nextEntry) return false;
    if (serializeComparableVehicleEmplacement(currentEntry) !== serializeComparableVehicleEmplacement(nextEntry)) return false;
  }

  const controlKind = String(options.controlKind ?? "weapon").trim().toLowerCase();
  for (const [id, currentEntry] of currentById.entries()) {
    const nextEntry = nextById.get(id);
    const weaponStateChanged = JSON.stringify(currentEntry?.weaponState ?? {}) !== JSON.stringify(nextEntry?.weaponState ?? {});
    const ammoChanged = JSON.stringify(currentEntry?.ammo ?? {}) !== JSON.stringify(nextEntry?.ammo ?? {});
    const neuralChanged = Boolean(currentEntry?.useNeuralLink) !== Boolean(nextEntry?.useNeuralLink)
      || String(currentEntry?.neuralLinkOperatorSeatKey ?? "").trim() !== String(nextEntry?.neuralLinkOperatorSeatKey ?? "").trim();

    if (controlKind === "neurallink") {
      if (weaponStateChanged || ammoChanged) return false;
      continue;
    }

    if (id !== targetId && (weaponStateChanged || ammoChanged || neuralChanged)) return false;
    if (id === targetId && neuralChanged) return false;
  }

  return true;
}

function getBreakpointClampMax(path = "", vehicleSystem = null, fallbackMax = Number.POSITIVE_INFINITY) {
  const source = normalizeVehicleSystemData(vehicleSystem ?? {});
  if (path === "system.overview.breakpoints.engine.current") return getConfiguredBaseValue(source?.breakpoints?.eng ?? {});
  if (path === "system.overview.breakpoints.hull.current") return getConfiguredBaseValue(source?.breakpoints?.hull ?? {});
  if (path.includes(".weapons.byId.")) return getConfiguredBaseValue(source?.breakpoints?.wep ?? {});
  if (path.includes(".optics.byId.")) return getConfiguredBaseValue(source?.breakpoints?.op ?? {});
  if (path.includes(".mobility.byId.")) return getConfiguredBaseValue(source?.breakpoints?.mob ?? {});

  const customMatch = path.match(/^system\.overview\.breakpoints\.custom\.(\d+)\.current$/u);
  if (customMatch) {
    const index = Number(customMatch[1]);
    const entry = Array.isArray(source?.overview?.breakpoints?.custom) ? source.overview.breakpoints.custom[index] : null;
    return Math.max(0, Math.round(Number(entry?.max ?? fallbackMax) || 0));
  }

  return fallbackMax;
}

function getExistingBreakpointCurrentValue(path = "", vehicleSystem = null) {
  const source = normalizeVehicleSystemData(vehicleSystem ?? {});
  const overview = source?.overview?.breakpoints ?? {};
  if (path === "system.overview.breakpoints.engine.current") {
    return { exists: true, value: overview?.engine?.current };
  }
  if (path === "system.overview.breakpoints.hull.current") {
    return { exists: true, value: overview?.hull?.current };
  }

  const keyedMatch = path.match(/^system\.overview\.breakpoints\.(weapons|optics|mobility)\.byId\.([A-Za-z0-9_-]+)\.current$/u);
  if (keyedMatch) {
    const [, sectionKey, trackerId] = keyedMatch;
    const byId = overview?.[sectionKey]?.byId;
    if (!byId || typeof byId !== "object" || !Object.prototype.hasOwnProperty.call(byId, trackerId)) {
      return { exists: false, value: 0 };
    }
    return { exists: true, value: byId[trackerId]?.current };
  }

  const customMatch = path.match(/^system\.overview\.breakpoints\.custom\.(\d+)\.current$/u);
  if (customMatch) {
    const index = Number(customMatch[1]);
    const entries = Array.isArray(overview?.custom) ? overview.custom : [];
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
      return { exists: false, value: 0 };
    }
    return { exists: true, value: entries[index]?.current };
  }

  return { exists: false, value: 0 };
}

function prepareBreakpointUpdate(vehicleActor = null, updatePath = "", rawValue = 0, fallbackMax = Number.POSITIVE_INFINITY) {
  const path = String(updatePath ?? "").trim();
  if (!isVehicleBreakpointCurrentUpdatePath(path)) return null;
  const vehicleSystem = normalizeVehicleSystemData(vehicleActor?.system ?? {});
  const existing = getExistingBreakpointCurrentValue(path, vehicleSystem);
  if (!existing.exists) return null;
  const max = getBreakpointClampMax(path, vehicleSystem, fallbackMax);
  let value = Number(rawValue);
  if (!Number.isFinite(value)) value = Number(existing.value ?? 0);
  if (!Number.isFinite(value)) value = 0;
  value = Math.max(0, Math.round(value));
  if (Number.isFinite(max)) value = Math.min(value, max);
  return { path, value };
}

function getActiveGmUser() {
  return (game?.users?.find?.((user) => user?.active && user?.isGM) ?? null)
    || (Array.from(game?.users ?? []).find((user) => user?.active && user?.isGM) ?? null);
}

function getResponsibleGmUserId() {
  const activeGms = Array.from(game?.users ?? [])
    .filter((user) => user?.active && user?.isGM)
    .sort((left, right) => String(left.id ?? "").localeCompare(String(right.id ?? "")));
  return String(activeGms[0]?.id ?? "").trim();
}

export async function requestVehicleBreakpointUpdate(vehicleActor = null, updatePath = "", rawValue = 0, options = {}) {
  const fallbackMax = Number(options.fallbackMax ?? Number.POSITIVE_INFINITY);
  const prepared = prepareBreakpointUpdate(vehicleActor, updatePath, rawValue, fallbackMax);
  if (!prepared) {
    return { applied: false, pending: false, value: rawValue, reason: "Invalid vehicle breakpoint path." };
  }

  const permission = resolveVehicleBreakpointEditPermission(vehicleActor, options);
  if (!permission.allowed) {
    return { applied: false, pending: false, value: prepared.value, reason: permission.reason };
  }

  if (game?.user?.isGM) {
    await vehicleActor.update({ [prepared.path]: prepared.value });
    return { applied: true, pending: false, value: prepared.value, reason: "" };
  }

  const activeGm = getActiveGmUser();
  if (!activeGm || typeof game?.socket?.emit !== "function") {
    try {
      await vehicleActor.update({ [prepared.path]: prepared.value });
      return { applied: true, pending: false, value: prepared.value, reason: "" };
    } catch (_error) {
      return { applied: false, pending: false, value: prepared.value, reason: "A GM must be connected to update this vehicle breakpoint." };
    }
  }

  game.socket.emit(`system.${MYTHIC_SYSTEM_ID}`, {
    type: MYTHIC_VEHICLE_BREAKPOINT_SOCKET_TYPE,
    userId: String(game.user?.id ?? ""),
    vehicleUuid: getVehicleActorReference(vehicleActor),
    updatePath: prepared.path,
    value: prepared.value,
    surface: String(options.surface ?? ""),
    requireAttachedActorUuid: String(options.requireAttachedActor?.uuid ?? ""),
    requireAttachedTokenUuid: String(options.requireAttachedToken?.uuid ?? options.requireAttachedActor?.token?.uuid ?? "")
  });

  return { applied: false, pending: true, value: prepared.value, reason: "" };
}

function prepareVehicleControlUpdate(vehicleActor = null, updateData = {}, options = {}) {
  if (String(vehicleActor?.type ?? "").trim().toLowerCase() !== "vehicle") {
    return { allowed: false, reason: "Vehicle actor is unavailable.", updateData: {} };
  }
  if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
    return { allowed: false, reason: "Invalid vehicle update payload.", updateData: {} };
  }

  const paths = Object.keys(updateData);
  const controlKind = String(options.controlKind ?? "").trim().toLowerCase();
  const currentSystem = normalizeVehicleSystemData(vehicleActor.system ?? {});

  if (controlKind === "speed") {
    if (paths.length !== 1 || paths[0] !== "system.movement.speed.value") {
      return { allowed: false, reason: "Invalid vehicle speed update.", updateData: {} };
    }
    const mobility = currentSystem?.movement ?? {};
    const topSpeed = Math.max(0, Math.round(Number(mobility?.speed?.max ?? 0) || 0));
    let nextSpeed = Math.max(0, Math.round(Number(updateData["system.movement.speed.value"] ?? 0) || 0));
    if (topSpeed > 0) nextSpeed = Math.min(nextSpeed, topSpeed);
    return { allowed: true, reason: "", updateData: { "system.movement.speed.value": nextSpeed } };
  }

  if (controlKind === "weapon" || controlKind === "neurallink") {
    if (paths.length !== 1 || paths[0] !== "system.weaponEmplacements") {
      return { allowed: false, reason: "Invalid vehicle weapon update.", updateData: {} };
    }
    const nextWeaponEmplacements = Array.isArray(updateData["system.weaponEmplacements"])
      ? foundry.utils.deepClone(updateData["system.weaponEmplacements"])
      : null;
    if (!nextWeaponEmplacements) return { allowed: false, reason: "Invalid vehicle weapon update.", updateData: {} };

    const nextSystem = normalizeVehicleSystemData({
      ...foundry.utils.deepClone(currentSystem),
      weaponEmplacements: nextWeaponEmplacements
    });
    if (!validateVehicleWeaponEmplacementUpdate(currentSystem, nextSystem, options)) {
      return { allowed: false, reason: "Invalid vehicle weapon update.", updateData: {} };
    }
    return {
      allowed: true,
      reason: "",
      updateData: { "system.weaponEmplacements": nextSystem.weaponEmplacements }
    };
  }

  if (controlKind === "crewassignment") {
    if (!validateVehicleCrewSlotClearUpdate(currentSystem, updateData, options)) {
      return { allowed: false, reason: "Invalid vehicle crew update.", updateData: {} };
    }
    const path = Object.keys(updateData)[0];
    return {
      allowed: true,
      reason: "",
      updateData: { [path]: foundry.utils.deepClone(updateData[path]) }
    };
  }

  return { allowed: false, reason: "Unsupported vehicle control update.", updateData: {} };
}

export function resolveVehicleControlPermission(vehicleActor = null, options = {}) {
  const user = options.user ?? game?.user ?? null;
  const surface = String(options.surface ?? "").trim();
  const vehicleType = String(vehicleActor?.type ?? "").trim().toLowerCase();
  if (vehicleType !== "vehicle") {
    return { allowed: false, reason: "Vehicle actor is unavailable.", seat: null };
  }
  if (user?.isGM) return { allowed: true, reason: "", seat: null };
  if (surface !== "characterVehicleTab") {
    return { allowed: false, reason: "Vehicle controls are not available from this surface.", seat: null };
  }

  const vehicleSystem = normalizeVehicleSystemData(vehicleActor.system ?? {});
  const ownedSeat = resolveUserOwnedSeat(vehicleActor, vehicleSystem, options);
  if (!ownedSeat.allowed) return ownedSeat;

  const controlKind = String(options.controlKind ?? "").trim().toLowerCase();
  if (!controlKind || controlKind === "seat") {
    return { allowed: true, reason: "", seat: ownedSeat.seat };
  }

  if (controlKind === "speed") {
    if (ownedSeat.role !== "operator") {
      return { allowed: false, reason: "Only an assigned vehicle operator can adjust vehicle speed.", seat: ownedSeat.seat };
    }
    return { allowed: true, reason: "", seat: ownedSeat.seat };
  }

  if (controlKind === "weapon" || controlKind === "neurallink") {
    const emplacementId = String(options.emplacementId ?? "").trim();
    const emplacements = Array.isArray(vehicleSystem?.weaponEmplacements) ? vehicleSystem.weaponEmplacements : [];
    const emplacement = emplacements.find((entry) => String(entry?.id ?? "").trim() === emplacementId) ?? null;
    if (!emplacement) return { allowed: false, reason: "Vehicle weapon emplacement is no longer available.", seat: ownedSeat.seat };
    if (!canSeatControlVehicleWeapon(ownedSeat.seat, emplacement, vehicleSystem, controlKind)) {
      return { allowed: false, reason: "This vehicle seat does not control that weapon.", seat: ownedSeat.seat };
    }
    return { allowed: true, reason: "", seat: ownedSeat.seat };
  }

  if (controlKind === "crewassignment") {
    const crewKey = String(options.crewKey ?? "").trim();
    const rawSlotIndex = Number(options.slotIndex ?? -1);
    const slotIndex = Number.isFinite(rawSlotIndex) ? Math.floor(rawSlotIndex) : -1;
    const expectedSeatKey = crewKey && slotIndex >= 0 ? `${crewKey}:${slotIndex + 1}` : "";
    if (!expectedSeatKey || String(ownedSeat.seatKey ?? "").trim() !== expectedSeatKey) {
      return { allowed: false, reason: "You can only remove your own assigned vehicle seat.", seat: ownedSeat.seat };
    }
    return { allowed: true, reason: "", seat: ownedSeat.seat };
  }

  return { allowed: false, reason: "Unsupported vehicle control.", seat: ownedSeat.seat };
}

export async function requestVehicleActorUpdate(vehicleActor = null, updateData = {}, options = {}) {
  const prepared = prepareVehicleControlUpdate(vehicleActor, updateData, options);
  if (!prepared.allowed) {
    return { applied: false, pending: false, reason: prepared.reason };
  }

  const permission = resolveVehicleControlPermission(vehicleActor, options);
  if (!permission.allowed) {
    return { applied: false, pending: false, reason: permission.reason };
  }

  if (game?.user?.isGM) {
    await vehicleActor.update(prepared.updateData);
    return { applied: true, pending: false, reason: "" };
  }

  const activeGm = getActiveGmUser();
  if (!activeGm || typeof game?.socket?.emit !== "function") {
    try {
      await vehicleActor.update(prepared.updateData);
      return { applied: true, pending: false, reason: "" };
    } catch (_error) {
      return { applied: false, pending: false, reason: "A GM must be connected to update this vehicle." };
    }
  }

  game.socket.emit(`system.${MYTHIC_SYSTEM_ID}`, {
    type: MYTHIC_VEHICLE_CONTROL_SOCKET_TYPE,
    userId: String(game.user?.id ?? ""),
    vehicleUuid: getVehicleActorReference(vehicleActor),
    updateData: prepared.updateData,
    surface: String(options.surface ?? ""),
    controlKind: String(options.controlKind ?? ""),
    emplacementId: String(options.emplacementId ?? ""),
    seatKey: String(options.seatKey ?? ""),
    crewKey: String(options.crewKey ?? ""),
    slotIndex: Number(options.slotIndex ?? -1),
    requireAttachedActorUuid: String(options.requireAttachedActor?.uuid ?? ""),
    requireAttachedTokenUuid: String(options.requireAttachedToken?.uuid ?? options.requireAttachedActor?.token?.uuid ?? "")
  });

  return { applied: false, pending: true, reason: "" };
}

async function handleVehicleBreakpointSocketMessage(payload = {}) {
  if (!game?.user?.isGM || payload?.type !== MYTHIC_VEHICLE_BREAKPOINT_SOCKET_TYPE) return;
  if (String(game.user.id ?? "") !== getResponsibleGmUserId()) return;

  const sourceUser = game.users?.get?.(String(payload.userId ?? "")) ?? null;
  const vehicleActor = resolveVehicleActorReference(payload.vehicleUuid);
  const prepared = prepareBreakpointUpdate(vehicleActor, payload.updatePath, payload.value);
  if (!sourceUser || !vehicleActor || !prepared) return;

  const requireAttachedActor = payload.requireAttachedActorUuid
    ? resolveStoredCrewReference(payload.requireAttachedActorUuid)
    : null;
  const requireAttachedToken = payload.requireAttachedTokenUuid
    ? unwrapVehicleTokenDocument(resolveStoredCrewReference(payload.requireAttachedTokenUuid))
    : null;

  const permission = resolveVehicleBreakpointEditPermission(vehicleActor, {
    user: sourceUser,
    surface: String(payload.surface ?? ""),
    requireAttachedActor,
    requireAttachedToken
  });
  if (!permission.allowed) return;

  await vehicleActor.update({ [prepared.path]: prepared.value });
}

async function handleVehicleControlSocketMessage(payload = {}) {
  if (!game?.user?.isGM || payload?.type !== MYTHIC_VEHICLE_CONTROL_SOCKET_TYPE) return;
  if (String(game.user.id ?? "") !== getResponsibleGmUserId()) return;

  const sourceUser = game.users?.get?.(String(payload.userId ?? "")) ?? null;
  const vehicleActor = resolveVehicleActorReference(payload.vehicleUuid);
  if (!sourceUser || !vehicleActor) return;

  const requireAttachedActor = payload.requireAttachedActorUuid
    ? resolveStoredCrewReference(payload.requireAttachedActorUuid)
    : null;
  const requireAttachedToken = payload.requireAttachedTokenUuid
    ? unwrapVehicleTokenDocument(resolveStoredCrewReference(payload.requireAttachedTokenUuid))
    : null;
  const options = {
    user: sourceUser,
    surface: String(payload.surface ?? ""),
    controlKind: String(payload.controlKind ?? ""),
    emplacementId: String(payload.emplacementId ?? ""),
    seatKey: String(payload.seatKey ?? ""),
    crewKey: String(payload.crewKey ?? ""),
    slotIndex: Number(payload.slotIndex ?? -1),
    requireAttachedActor,
    requireAttachedToken
  };

  const prepared = prepareVehicleControlUpdate(vehicleActor, payload.updateData, options);
  if (!prepared.allowed) return;

  const permission = resolveVehicleControlPermission(vehicleActor, options);
  if (!permission.allowed) return;

  await vehicleActor.update(prepared.updateData);
}

export function registerVehicleBreakpointPermissionSocket() {
  if (typeof game?.socket?.on !== "function") return;
  game.socket.on(`system.${MYTHIC_SYSTEM_ID}`, (payload) => {
    void handleVehicleBreakpointSocketMessage(payload);
    void handleVehicleControlSocketMessage(payload);
  });
}
