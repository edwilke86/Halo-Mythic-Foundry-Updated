# Mythic Container System Notes

## Architecture

Containers use owned item metadata, not duplicated inventory blobs. Stored items remain normal actor-owned `Item` documents and point at their parent with `system.storage.parentContainerId`. Container contents are derived from the actor item collection, which keeps item sheets, embedded document updates, deletion, migration, and drag/drop behavior aligned with Foundry's document model.

Runtime helpers live in `scripts/mechanics/storage.mjs`. Source-of-truth rule parsing and default mappings live in `scripts/reference/mythic-storage-rules.mjs`.

Mount/webbing requirements are currently normalized into item data but not enforced at runtime. The enforcement switch is `ENFORCE_STORAGE_MOUNT_REQUIREMENTS` in `scripts/mechanics/storage.mjs`.

## Data Model

Every gear item receives normalized `system.storage` data:

- `isContainer`, `containerType`, `capacityUnits`
- `storageUnits`, `storageUnitsSource`, `storageUnitsRuleKey`, `storageCategory`
- `parentContainerId`, `sort`
- `acceptedContentRules`
- `mountRules`, `mountedTo`, `mountedState`, `wornState`
- quickdraw and classification flags
- `weightModifierMode`

Magazine-like containers also receive `system.magazine`:

- `ammoCapacity`
- ordered `loadedRounds[]`

Each loaded round stores a stable id, ammo reference fields, label, ammo type key, image, and optional flags. This preserves mixed ammo order for later firing logic.

## Migration Strategy

Gear schema version is now `3`; world migration version is now `8`.

Normalization is idempotent and derives storage fields from existing item data, names, and descriptions. The world migration now normalizes actor embedded gear items as well as world items, so existing worlds get storage defaults without losing current equipment state.

Carrying-unit values are automatic unless `system.storage.storageUnitsSource` is `manual`. Legacy items with no source and `storageUnits = 1` are treated as automatic so handbook table mappings can update them; legacy items with no source and a non-`1` value are treated as manual to preserve user edits. The item sheet and open container sheet both provide direct unit editing and reset-to-auto controls.

## Follow-Up Opportunities

- Expand carrying-unit mappings as more handbook tables are transcribed.
- Add a UI for custom accepted-content rules and magazine ammo capacity on item sheets.
- Connect `weightModifierMode` to carried-weight calculations for worn packs.
- Replace the legacy actor-level ballistic magazine tracker with item-backed magazine documents when ready.
- Add Foundry runtime tests around actual drag/drop events once a test harness is available.
