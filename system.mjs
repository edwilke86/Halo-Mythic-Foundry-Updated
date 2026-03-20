// ============================================================
//  Halo Mythic Foundry — System Entry Point
//
//  This file bootstraps the system by importing all modules and
//  registering Foundry VTT hooks. The actual logic lives in the
//  scripts/ directory tree.
//
//  Backup of the original monolithic file: system.mjs.bak
// ============================================================

import { registerAllHooks } from "./scripts/core/hooks.mjs";

// Boot the system — register all Foundry hooks (init, ready, preCreate*, etc.)
registerAllHooks();
