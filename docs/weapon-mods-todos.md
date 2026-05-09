Figure out what the aiming penalties referenced are in 'allowing for another item to be mounted, such as a Laser, without adding Aiming Penalties

# Weapon Mods TODOs

- Rollout rule: add all weapon mod items first with scaffolded metadata and TODO-driven effect placeholders.
- Rollout rule: after all individual mods are represented, implement the weapon designer customization workflow.

- Define smartlink capability detection and enforcement for characters, bestiary actors, armor, VISR, eyepieces, and other smartlink-capable devices.
- Use the optic `smartlink` boolean when converting optic items into installed weapon mods.
- Apply `toHitSmart` only when the user is fully smartlink capable.
- Add character and bestiary sheet toggles for toggleable optic special rules such as Night Vision, Thermal Imaging, and Infrared Imaging.
- Prompt in the attack dialog for conditions that suppress `toHitClose`, including bright lights, blinding lights, flashbangs, gas, heavy fog, and smoke.
- Implement Threat Marker friendly/enemy IFF tagging, including tracking scanned tags for up to 4 rounds after line of sight is lost.
- Add modular magnification switching as a half-action workflow.
- Validate rail slot usage, mount legality, and rail/mount capacity.
- Finish conditional barrel automation hooks (Spread/Slug/HV/HYV/+P/+P+, unbraced, camouflage, natural-100 breakage, damage-under-20 aim retention).
- Add richer weapon-mod breakdown tooltips in the derived preview panel.
