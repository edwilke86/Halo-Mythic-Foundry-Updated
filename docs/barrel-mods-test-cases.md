# Barrel Mods Integration Test Cases

1. Pistol can install `SOCOM Attachment System` from Available Compatible Mods.
2. SMG can install `SOCOM Attachment System`.
3. Rifle does not show `SOCOM Attachment System` in compatible list.
4. MA-series rifle/carbine shows `Hush SOCOM Kit` in compatible list.
5. Non-MA rifle does not show `Hush SOCOM Kit` in compatible list.
6. Installing SOCOM blocks additional barrel/lower installs; blocked list shows reasons.
7. Installing Hush blocks additional barrel/lower installs; blocked list shows reasons.
8. `Extended Barrel` cannot be installed with `Short Barrel`.
9. `Sawed-Off Barrel` cannot stack with other barrel modifications.
10. `Heavy Barrel` + `Extended Barrel` applies single combined +30% base-weight rule.
11. `Sound Dampener` is unavailable when campaign year < 2557 and available at 2557+.
12. Shotgun-only chokes do not appear for non-shotgun weapons.
13. Choke slug/spread rules surface in derived warnings (not silently auto-applied).
14. `SS/M 49 Sound Suppressor` requires HV/HYV compatibility.
15. Built-In Features render in a separate section and do not consume mount slots.
16. Built-In Features marked `includedInBaseWeight` do not add derived weight.
17. Derived preview shows base and modified values side-by-side.
18. Removing an installed mod restores derived values without mutating base weapon stats.
