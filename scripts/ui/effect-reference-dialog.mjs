import {
  loadMythicMedicalEffectDefinitions,
  loadMythicEnvironmentalEffectDefinitions,
  loadMythicFearEffectDefinitions,
  loadMythicSpecialDamageDefinitions
} from "../data/content-loading.mjs";

import { normalizeLookupText } from "../utils/helpers.mjs";

const DOMAIN_LABELS = Object.freeze({
  medical: "Medical Effect",
  environmental: "Environmental Effect",
  "fear-ptsd": "Fear / Mental Disorder",
  reference: "Reference"
});

function escapeHtml(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

function normalizeSearchName(value) {
  return normalizeLookupText(String(value ?? "").replace(/\s*\([^)]*\)\s*$/u, "").trim());
}

async function loadDomainCatalog(domain = "medical") {
  const normalizedDomain = String(domain ?? "medical").trim().toLowerCase() || "medical";
  if (normalizedDomain === "environmental") return loadMythicEnvironmentalEffectDefinitions();
  if (normalizedDomain === "fear-ptsd") return loadMythicFearEffectDefinitions();
  return loadMythicMedicalEffectDefinitions();
}

function buildCollectionTable(title, columns, rows) {
  if (!Array.isArray(rows) || rows.length < 1) return "";
  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows.map((row) => {
    const cells = columns.map((column) => `<td>${escapeHtml(row?.[column.key] ?? "-")}</td>`).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  return `
    <section class="mythic-effect-reference-section">
      <h4>${escapeHtml(title)}</h4>
      <table class="mythic-effect-reference-table">
        <thead><tr>${header}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>
  `;
}

function buildTextSection(title, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `
    <section class="mythic-effect-reference-section">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text)}</p>
    </section>
  `;
}

function buildReferenceSections(definition = {}, effectEntry = null) {
  const sections = [];
  const activeDuration = String(effectEntry?.durationSummary ?? "").trim();
  const activeNotes = String(effectEntry?.notes ?? "").trim();
  const sourcePage = Number(definition?.sourcePage ?? 0);

  if (activeDuration || activeNotes || sourcePage > 0) {
    sections.push(`
      <section class="mythic-effect-reference-section mythic-effect-reference-meta-grid">
        ${activeDuration ? `<div><span>Active Duration</span><strong>${escapeHtml(activeDuration)}</strong></div>` : ""}
        ${sourcePage > 0 ? `<div><span>Source</span><strong>p.${escapeHtml(sourcePage)}</strong></div>` : ""}
        ${activeNotes ? `<div class="full"><span>Active Notes</span><strong>${escapeHtml(activeNotes)}</strong></div>` : ""}
      </section>
    `);
  }

  sections.push(buildTextSection("Summary", definition?.summaryText));
  sections.push(buildTextSection("Mechanical Notes", definition?.mechanicalText));
  sections.push(buildTextSection("Duration", definition?.durationText ?? effectEntry?.durationLabel));
  sections.push(buildTextSection("Recovery", definition?.recoveryText ?? effectEntry?.recoveryLabel));
  sections.push(buildTextSection("Stacking", definition?.stackingText));
  sections.push(buildTextSection("Reference", definition?.sourceText));

  sections.push(buildCollectionTable(
    "Examples",
    [{ key: "label", label: "Example" }, { key: "modifier", label: "Modifier" }],
    Array.isArray(definition?.fearExamples) ? definition.fearExamples : []
  ));
  sections.push(buildCollectionTable(
    "Outcome Table",
    [{ key: "rollRange", label: "Roll" }, { key: "effect", label: "Effect" }],
    Array.isArray(definition?.outcomes) ? definition.outcomes : []
  ));
  sections.push(buildCollectionTable(
    "Entries",
    [{ key: "name", label: "Name" }, { key: "description", label: "Description" }],
    Array.isArray(definition?.entries) ? definition.entries : []
  ));
  sections.push(buildCollectionTable(
    "Type Table",
    [{ key: "rollRange", label: "Roll" }, { key: "effect", label: "Type" }],
    Array.isArray(definition?.types) ? definition.types : []
  ));
  sections.push(buildCollectionTable(
    "Radiation Levels",
    [{ key: "rollRange", label: "Roll" }, { key: "rl", label: "RL" }, { key: "effect", label: "Effect" }],
    Array.isArray(definition?.radiationLevels) ? definition.radiationLevels : []
  ));
  sections.push(buildCollectionTable(
    "Temperature Bands",
    [{ key: "label", label: "Band" }, { key: "summaryText", label: "Summary" }, { key: "mechanicalText", label: "Mechanical" }],
    Array.isArray(definition?.temperatureBands) ? definition.temperatureBands : []
  ));

  return sections.filter(Boolean).join("");
}

export async function resolveEffectReference(effectEntry = {}) {
  const domain = String(effectEntry?.domain ?? "medical").trim().toLowerCase() || "medical";
  const loadedCatalog = await loadDomainCatalog(domain);
  const catalog = Array.isArray(loadedCatalog) ? loadedCatalog : [];
  const effectKey = String(effectEntry?.effectKey ?? effectEntry?.metadata?.manualDefinitionKey ?? "").trim();
  const effectName = normalizeSearchName(effectEntry?.displayName ?? effectEntry?.name ?? effectKey);

  let definition = catalog.find((entry) => String(entry?.key ?? "").trim() === effectKey) ?? null;
  if (!definition && effectName) {
    definition = catalog.find((entry) => normalizeSearchName(entry?.name ?? entry?.key ?? "") === effectName) ?? null;
  }

  if (!definition && domain === "medical") {
    const loadedSpecialDamage = await loadMythicSpecialDamageDefinitions();
    const specialDamage = Array.isArray(loadedSpecialDamage) ? loadedSpecialDamage : [];
    definition = specialDamage.find((entry) => String(entry?.key ?? "").trim() === effectKey) ?? null;
    if (!definition && effectName) {
      definition = specialDamage.find((entry) => normalizeSearchName(entry?.name ?? entry?.key ?? "") === effectName) ?? null;
    }
  }

  if (!definition) return null;
  return {
    domain,
    domainLabel: DOMAIN_LABELS[domain] ?? DOMAIN_LABELS.reference,
    definition,
    effectEntry,
    title: String(definition?.name ?? effectEntry?.displayName ?? "Reference").trim() || "Reference"
  };
}

export function buildEffectReferenceMarkup(reference, { forChat = false } = {}) {
  if (!reference?.definition) return "";
  const { title, domainLabel, definition, effectEntry } = reference;
  const sections = buildReferenceSections(definition, effectEntry);
  return `
    <article class="mythic-chat-card mythic-effect-reference-card ${forChat ? "mythic-effect-reference-chat" : ""}">
      <header class="mythic-chat-header">
        <span class="mythic-chat-title">${escapeHtml(title)}</span>
      </header>
      <div class="mythic-chat-subheader">${escapeHtml(domainLabel)}</div>
      <div class="mythic-effect-reference-body">
        ${sections || `<section class="mythic-effect-reference-section"><p>No reference text is available for this entry yet.</p></section>`}
      </div>
    </article>
  `;
}

export async function openEffectReferenceDialog({ actor = null, effectEntry = null } = {}) {
  const reference = await resolveEffectReference(effectEntry);
  if (!reference) {
    ui.notifications?.warn("No reference entry could be found for that effect.");
    return;
  }

  const action = await foundry.applications.api.DialogV2.wait({
    window: {
      title: reference.title
    },
    content: `<div class="mythic-effect-reference-dialog">${buildEffectReferenceMarkup(reference)}</div>`,
    buttons: [
      {
        action: "chat",
        label: "Display In Chat",
        callback: () => "chat"
      },
      {
        action: "close",
        label: "Close",
        default: true,
        callback: () => "close"
      }
    ],
    rejectClose: false,
    modal: false
  });

  if (action !== "chat") return;

  await ChatMessage.create({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : { alias: "Halo Mythic Reference" },
    content: buildEffectReferenceMarkup(reference, { forChat: true }),
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
}