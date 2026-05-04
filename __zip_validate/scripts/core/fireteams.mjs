import {
  getMythicTokenIdentity,
} from "./token-identity.mjs";

const SYSTEM_ID = "Halo-Mythic-Foundry-Updated";

export const MYTHIC_FIRETEAMS_SETTING_KEY = "fireteams";
export const MYTHIC_FIRETEAM_GROUP_TYPE = "fireteam";
export const MYTHIC_LEGACY_PARTY_GROUP_TYPE = "squad-party";

export function registerMythicFireteamsSetting() {
  game.settings.register(SYSTEM_ID, MYTHIC_FIRETEAMS_SETTING_KEY, {
    name: "Fireteams (Internal)",
    hint: "World-scoped Fireteam definitions used for Mythic Fireteam/VISR features.",
    scope: "world",
    config: false,
    type: Object,
    default: [],
    restricted: true,
    onChange: () => {
      try {
        if (!canvas?.ready) return;
        for (const token of canvas.tokens?.placeables ?? []) {
          token.refresh();
        }
      } catch (error) {
        console.warn("[mythic-system] Failed to refresh tokens after Fireteam change.", error);
      }
    },
  });
}

function normalizeUuid(value) {
  const uuid = String(value ?? "").trim();
  return uuid || "";
}

function getTokenSceneId(token) {
  return String(token?.document?.parent?.id ?? "").trim();
}

export function getSameSceneTokens(token) {
  const sceneId = getTokenSceneId(token);
  if (!sceneId || !canvas?.ready) return [];
  return (canvas.tokens?.placeables ?? []).filter(
    (placeable) => getTokenSceneId(placeable) === sceneId,
  );
}

export function normalizeFireteamMember(memberLike = {}) {
  const member =
    memberLike && typeof memberLike === "object" ? memberLike : {};

  return {
    id: String(member.id ?? "").trim() || foundry.utils.randomID(),
    actorUuid: normalizeUuid(member.actorUuid),
    tokenUuid: normalizeUuid(member.tokenUuid),
    displayName: String(member.displayName ?? "").trim() || "Member",
    hasVisr: member.hasVisr !== false,
    role: String(member.role ?? "").trim(),
    notes: String(member.notes ?? "").trim(),
  };
}

export function normalizeFireteam(fireteamLike = {}) {
  const fireteam =
    fireteamLike && typeof fireteamLike === "object" ? fireteamLike : {};

  return {
    id: String(fireteam.id ?? "").trim() || foundry.utils.randomID(),
    name: String(fireteam.name ?? "").trim() || "Fireteam",
    members: Array.isArray(fireteam.members)
      ? fireteam.members.map((entry) => normalizeFireteamMember(entry))
      : [],
    options:
      fireteam.options && typeof fireteam.options === "object"
        ? foundry.utils.deepClone(fireteam.options)
        : {},
  };
}

export function normalizeFireteams(fireteamsLike) {
  const raw = Array.isArray(fireteamsLike)
    ? fireteamsLike
    : fireteamsLike
      ? [fireteamsLike]
      : [];

  return raw.map((entry) => normalizeFireteam(entry));
}

export function getLegacyMythicFireteams() {
  const stored = game.settings.get(SYSTEM_ID, MYTHIC_FIRETEAMS_SETTING_KEY);
  return normalizeFireteams(foundry.utils.deepClone(stored ?? []));
}

function normalizeGroupType(value = "") {
  return String(value ?? MYTHIC_LEGACY_PARTY_GROUP_TYPE).trim().toLowerCase();
}

export function isFireteamGroupActor(actor) {
  if (!actor) return false;
  if (String(actor.type ?? "").trim().toLowerCase() !== "group") return false;
  const groupType = normalizeGroupType(actor.system?.groupType);
  return (
    groupType === MYTHIC_FIRETEAM_GROUP_TYPE ||
    groupType === MYTHIC_LEGACY_PARTY_GROUP_TYPE
  );
}

function buildFireteamMemberFromActor(actor, { hasVisr = true } = {}) {
  if (!actor) return null;
  return normalizeFireteamMember({
    actorUuid: normalizeUuid(actor.uuid),
    tokenUuid: "",
    displayName: String(actor.name ?? "").trim() || "Actor",
    hasVisr,
  });
}

function buildLinkedActorFireteamMembers(groupActor) {
  const linkedActors = Array.isArray(groupActor?.system?.linkedActors)
    ? groupActor.system.linkedActors
    : [];

  return linkedActors
    .map((entry) => {
      const actorId =
        typeof entry === "string"
          ? entry
          : String(entry?.id ?? entry?._id ?? entry?.actorId ?? "").trim();
      const actor = actorId ? game.actors?.get?.(actorId) : null;
      return actor ? buildFireteamMemberFromActor(actor) : null;
    })
    .filter(Boolean);
}

export function getGroupActorFireteamMembers(groupActor) {
  const hasStoredMembers = foundry.utils.hasProperty(
    groupActor ?? {},
    "system.fireteam.members",
  );
  const storedMembers = Array.isArray(groupActor?.system?.fireteam?.members)
    ? groupActor.system.fireteam.members
    : [];
  if (hasStoredMembers) {
    return storedMembers.map((entry) => normalizeFireteamMember(entry));
  }
  return buildLinkedActorFireteamMembers(groupActor);
}

export function getGroupActorFireteams() {
  const actors = game.actors?.contents ?? [];
  return actors
    .filter((actor) => isFireteamGroupActor(actor))
    .map((actor) =>
      normalizeFireteam({
        id: String(actor.uuid ?? actor.id ?? "").trim(),
        name: String(actor.name ?? "").trim() || "Fireteam",
        members: getGroupActorFireteamMembers(actor),
        options: {
          source: "groupActor",
          actorUuid: String(actor.uuid ?? "").trim(),
          actorId: String(actor.id ?? "").trim(),
          groupType: String(actor.system?.groupType ?? "").trim(),
        },
      }),
    );
}

export function getMythicFireteams() {
  return [...getGroupActorFireteams(), ...getLegacyMythicFireteams()];
}

export async function setMythicFireteams(nextFireteams = []) {
  const normalized = normalizeFireteams(nextFireteams);
  await game.settings.set(SYSTEM_ID, MYTHIC_FIRETEAMS_SETTING_KEY, normalized);
  return normalized;
}

export function buildFireteamMemberFromToken(token, { hasVisr = true } = {}) {
  if (!token?.document) return null;
  const tokenUuid = normalizeUuid(token.document.uuid);
  const actorUuid = normalizeUuid(token.actor?.uuid);
  const displayName =
    String(token.name ?? token.document.name ?? token.actor?.name ?? "").trim() ||
    "Token";

  return normalizeFireteamMember({
    actorUuid,
    tokenUuid,
    displayName,
    hasVisr,
  });
}

export async function buildFireteamMemberFromUuid(uuid, { hasVisr = true } = {}) {
  const resolvedUuid = normalizeUuid(uuid);
  if (!resolvedUuid) return null;

  let document = null;
  try {
    document = await fromUuid(resolvedUuid);
  } catch (_error) {
    document = null;
  }
  if (!document) return null;

  const isToken = document?.documentName === "Token";
  if (isToken) {
    const tokenUuid = normalizeUuid(document.uuid);
    const actorUuid = normalizeUuid(document.actor?.uuid);
    const displayName =
      String(document.name ?? document.actor?.name ?? "").trim() || "Token";
    return normalizeFireteamMember({
      actorUuid,
      tokenUuid,
      displayName,
      hasVisr,
    });
  }

  const isActor = document?.documentName === "Actor";
  if (isActor) {
    const actorUuid = normalizeUuid(document.uuid);
    const displayName = String(document.name ?? "").trim() || "Actor";
    return normalizeFireteamMember({
      actorUuid,
      tokenUuid: "",
      displayName,
      hasVisr,
    });
  }

  return null;
}

function linkedIdentityMatchesActorUuid(identity, actorUuid) {
  const normalizedActorUuid = normalizeUuid(actorUuid);
  if (!identity?.actorLink || !normalizedActorUuid) return false;
  return (
    identity.actorUuid === normalizedActorUuid ||
    identity.baseActorUuid === normalizedActorUuid
  );
}

export function getLinkedActorSceneMatchCount(sceneTokens = [], actorUuid = "") {
  const normalizedActorUuid = normalizeUuid(actorUuid);
  if (!normalizedActorUuid) return 0;
  return (Array.isArray(sceneTokens) ? sceneTokens : []).filter((token) =>
    linkedIdentityMatchesActorUuid(
      getMythicTokenIdentity(token),
      normalizedActorUuid,
    ),
  ).length;
}

export function tokenMatchesFireteamMember(token, member, { sceneTokens = null } = {}) {
  if (!token?.document || !member) return false;
  const identity = getMythicTokenIdentity(token);
  const memberTokenUuid = normalizeUuid(member.tokenUuid);
  const memberActorUuid = normalizeUuid(member.actorUuid);

  if (memberTokenUuid && identity.tokenUuid === memberTokenUuid) return true;
  if (!memberActorUuid || memberTokenUuid) return false;
  if (!linkedIdentityMatchesActorUuid(identity, memberActorUuid)) return false;

  const tokensToCheck = Array.isArray(sceneTokens)
    ? sceneTokens
    : getSameSceneTokens(token);
  return getLinkedActorSceneMatchCount(tokensToCheck, memberActorUuid) === 1;
}

export function getFireteamsForToken(token) {
  const fireteams = getMythicFireteams();
  const sceneTokens = getSameSceneTokens(token);
  return fireteams.filter((fireteam) =>
    fireteam.members.some((member) =>
      tokenMatchesFireteamMember(token, member, { sceneTokens }),
    ),
  );
}

export function findFireteamById(fireteams, fireteamId) {
  const id = String(fireteamId ?? "").trim();
  if (!id) return null;
  return (Array.isArray(fireteams) ? fireteams : []).find(
    (entry) => String(entry?.id ?? "").trim() === id,
  ) ?? null;
}
