# Halo-Mythic-Foundry-Updated
My attempt at making a new system for Foundry/Forge VTT with the Halo Mythic Ruleset. 

## Foundry System Start (Step 1)

This repository now includes a minimal Foundry system scaffold with no game-specific logic yet.

### Best-practice starting approach

1. Start with only a valid `system.json` manifest at the system root.
2. Add one ES module entry file and only basic hooks (`init`, `ready`).
3. Define only one Actor type and one Item type to begin.
4. Add one language file (`lang/en.json`) and one stylesheet (`styles/system.css`).
5. Validate that the system appears and loads in Foundry before adding sheets, rules, or data models.

### Included scaffold files

- `system.json`
- `system.mjs`
- `lang/en.json`
- `styles/system.css`

### Next tiny step

Create a very basic Actor sheet template and register it, without adding any Halo-specific stats yet.
