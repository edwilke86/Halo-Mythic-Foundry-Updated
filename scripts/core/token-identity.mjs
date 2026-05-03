function normalizeUuid(value) {
  const uuid = String(value ?? "").trim();
  return uuid || "";
}

export function getMythicTokenIdentity(token) {
  const placeable = token?.object ?? token;
  const document = placeable?.document ?? token?.document ?? null;
  const actor = placeable?.actor ?? document?.actor ?? null;
  const actorId = String(document?.actorId ?? actor?.id ?? "").trim();
  const baseActor = actorId ? game.actors?.get?.(actorId) : null;
  const actorLink = Boolean(document?.actorLink);

  return {
    tokenUuid: normalizeUuid(document?.uuid),
    actorUuid: normalizeUuid(actor?.uuid ?? document?.actor?.uuid),
    baseActorUuid: normalizeUuid(baseActor?.uuid),
    actorId,
    actorLink,
    sceneId: String(document?.parent?.id ?? "").trim(),
  };
}

export function tokenIdentityMatchesMember(identity, member) {
  if (!identity || !member) return false;
  const memberTokenUuid = normalizeUuid(member.tokenUuid);
  const memberActorUuid = normalizeUuid(member.actorUuid);

  if (memberTokenUuid && identity.tokenUuid === memberTokenUuid) return true;
  if (!memberActorUuid) return false;
  if (identity.actorUuid === memberActorUuid) return true;
  return Boolean(identity.actorLink) && identity.baseActorUuid === memberActorUuid;
}

export function tokenMatchesActor(token, actor) {
  if (!token?.document || !actor) return false;
  const identity = getMythicTokenIdentity(token);
  const actorId = String(actor.id ?? "").trim();
  const actorUuid = normalizeUuid(actor.uuid);

  return (
    (actorId && identity.actorLink && identity.actorId === actorId) ||
    (actorUuid &&
      (identity.actorUuid === actorUuid ||
        (identity.actorLink && identity.baseActorUuid === actorUuid)))
  );
}
