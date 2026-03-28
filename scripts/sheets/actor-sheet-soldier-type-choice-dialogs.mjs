import { toNonNegativeWhole } from "../utils/helpers.mjs";

export const soldierTypeChoiceDialogMethods = {

_promptSoldierTypeSkillChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.skillChoices) ? templateSystem.skillChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-skill-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);

    const allSkillLabels = this._getAllSkillLabels();
    if (!allSkillLabels.length) {
      ui.notifications.warn("No skills found to satisfy Soldier Type skill choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => {
      if (tier === "plus20") return "+20";
      if (tier === "plus10") return "+10";
      return "Trained";
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "");
      const label = String(rule?.label ?? "Skills of choice").trim() || "Skills of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allSkillLabels.map((skillLabel) => {
        const safeLabel = foundry.utils.escapeHTML(skillLabel);
        return `
          <label style="display:block;margin:2px 0">
            <input type="checkbox"
                   name="mythic-st-choice-${ruleIndex}"
                   value="${safeLabel}"
                   data-rule-index="${ruleIndex}"
                   data-rule-count="${count}"
                   data-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "trained"))}"
                   data-label="${foundry.utils.escapeHTML(label)}"
                   data-source="${foundry.utils.escapeHTML(source)}"
                   data-notes="${foundry.utils.escapeHTML(notes)}"
            />
            ${safeLabel}
          </label>
        `;
      }).join("");

      return `
        <fieldset data-choice-rule-index="${ruleIndex}" data-choice-rule-count="${count}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` - ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` - ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-choice-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div style="max-height:160px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isDialogSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        return selectedCount === requiredCount;
      });
    };

    const refreshSelectionState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;

      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const requiredCount = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selectedCount = dialogBody.querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-choice-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selectedCount}/${requiredCount} selected`;
          status.style.color = selectedCount === requiredCount ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }

      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isDialogSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of skills in each group.";
      }
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Skill Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-skill-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes skill-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        dialogBody.querySelectorAll("input[type='checkbox'][name^='mythic-st-choice-']").forEach((input) => {
          input.addEventListener("change", () => {
            refreshSelectionState(dialogBody);
          });
        });

        refreshSelectionState(dialogBody);
      },
      buttons: [
        {
          action: "apply",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Rule ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }

              const seen = new Set();
              for (const box of checked) {
                const skillName = String(box.value ?? "").trim();
                const marker = this._normalizeNameForMatch(skillName);
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate skill selected in the same choice group. Pick different skills.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  skillName,
                  tier: String(box.getAttribute("data-tier") ?? "trained"),
                  label: String(box.getAttribute("data-label") ?? "Skills of choice"),
                  source: String(box.getAttribute("data-source") ?? ""),
                  notes: String(box.getAttribute("data-notes") ?? "")
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  },

  async _promptSoldierTypeEducationChoices(templateName, templateSystem) {
    const rules = Array.isArray(templateSystem?.educationChoices) ? templateSystem.educationChoices : [];
    if (!rules.length) return Promise.resolve([]);

    const dialogBodySelector = ".mythic-st-edu-choice-dialog";
    const getDialogBody = () => document.querySelector(dialogBodySelector);
    const factionOptions = this._getFactionPromptChoices();
    const factionOptionMarkup = factionOptions
      .map((entry) => `<option value="${foundry.utils.escapeHTML(entry.value)}">${foundry.utils.escapeHTML(entry.label)}</option>`)
      .join("");

    let allEducationNames = [];
    try {
      const pack = game.packs.get("Halo-Mythic-Foundry-Updated.educations");
      if (pack) {
        const index = await pack.getIndex();
        allEducationNames = index
          .map((entry) => String(entry?.name ?? "").trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
      }
    } catch (_err) {
      // silent
    }

    if (!allEducationNames.length) {
      ui.notifications?.warn("No educations found in the compendium to satisfy Soldier Type education choices.");
      return Promise.resolve([]);
    }

    const tierLabel = (tier) => tier === "plus10" ? "+10" : "+5";
    const createRowMarkup = (ruleIndex, rowIndex, educationName) => {
      const cleanEducationName = String(educationName ?? "").trim();
      const isFactionEducation = this._isFactionEducationName(cleanEducationName);
      const isInstrumentEducation = this._isInstrumentEducationName(cleanEducationName);
      const safeBaseName = foundry.utils.escapeHTML(cleanEducationName);
      const displayLabel = foundry.utils.escapeHTML(this._getEducationChoiceDisplayLabel(cleanEducationName));
      const extraMarkup = isFactionEducation
        ? `
          <div data-edu-config="faction" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Faction</span>
              <select data-edu-faction-select style="min-width:220px">
                ${factionOptionMarkup}
              </select>
            </label>
            <label data-edu-faction-other-wrap style="display:none;align-items:center;gap:6px;flex-wrap:wrap">
              <span>Custom</span>
              <input type="text" data-edu-faction-other placeholder="Enter faction name..." />
            </label>
          </div>
        `
        : isInstrumentEducation
          ? `
            <div data-edu-config="instrument" style="display:none;margin:6px 0 0 22px;gap:6px;align-items:center;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span>Instrument</span>
                <input type="text" data-edu-instrument-input placeholder="e.g. Theremin" />
              </label>
            </div>
          `
          : "";

      return `
        <div class="mythic-st-edu-row" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" data-edu-base-name="${safeBaseName}" data-edu-repeatable="${isFactionEducation || isInstrumentEducation ? "true" : "false"}" style="margin:2px 0">
          <label style="display:block">
            <input type="checkbox" name="mythic-st-edu-choice-${ruleIndex}" value="${safeBaseName}" data-rule-index="${ruleIndex}" data-row-index="${rowIndex}" />
            ${displayLabel}
          </label>
          ${extraMarkup}
        </div>
      `;
    };

    const blocks = rules.map((rule, ruleIndex) => {
      const source = String(rule?.source ?? "").trim();
      const notes = String(rule?.notes ?? "");
      const label = String(rule?.label ?? "Educations of choice").trim() || "Educations of choice";
      const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
      const checkboxRows = allEducationNames.map((eduName, eduIndex) => createRowMarkup(ruleIndex, eduIndex, eduName)).join("");

      return `
        <fieldset data-edu-rule-index="${ruleIndex}" data-edu-rule-count="${count}" data-edu-tier="${foundry.utils.escapeHTML(String(rule?.tier ?? "plus5"))}" data-edu-label="${foundry.utils.escapeHTML(label)}" data-edu-source="${foundry.utils.escapeHTML(source)}" data-edu-notes="${foundry.utils.escapeHTML(notes)}" style="margin:0 0 10px 0;padding:8px;border:1px solid rgba(255,255,255,0.18)">
          <legend style="padding:0 6px">${foundry.utils.escapeHTML(label)}</legend>
          <p style="margin:0 0 8px 0">Choose exactly ${count} at <strong>${tierLabel(rule?.tier)}</strong>${source ? ` - ${foundry.utils.escapeHTML(source)}` : ""}${notes ? ` - ${foundry.utils.escapeHTML(notes)}` : ""}</p>
          <p data-edu-count-status="${ruleIndex}" style="margin:0 0 8px 0;font-size:11px;opacity:0.9">0/${count} selected</p>
          <div data-edu-rule-container="${ruleIndex}" style="max-height:240px;overflow:auto;border:1px solid rgba(255,255,255,0.12);padding:6px;border-radius:4px;background:rgba(0,0,0,0.15)">
            ${checkboxRows}
          </div>
        </fieldset>
      `;
    }).join("");

    const isSelectionValid = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return false;
      return rules.every((_rule, ruleIndex) => {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const checked = Array.from(dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
        if (checked.length !== required) return false;
        return checked.every((box) => {
          const row = box.closest(".mythic-st-edu-row");
          if (!(row instanceof HTMLElement)) return false;
          const baseName = String(row.dataset.eduBaseName ?? "").trim();
          if (this._isFactionEducationName(baseName)) {
            const select = row.querySelector("[data-edu-faction-select]");
            const other = row.querySelector("[data-edu-faction-other]");
            const value = String(select?.value ?? "").trim();
            return value && (value !== "__other__" || Boolean(String(other?.value ?? "").trim()));
          }
          if (this._isInstrumentEducationName(baseName)) {
            const input = row.querySelector("[data-edu-instrument-input]");
            return Boolean(String(input?.value ?? "").trim());
          }
          return true;
        });
      });
    };

    const toggleFactionOtherVisibility = (row) => {
      if (!(row instanceof HTMLElement)) return;
      const select = row.querySelector("[data-edu-faction-select]");
      const otherWrap = row.querySelector("[data-edu-faction-other-wrap]");
      if (otherWrap instanceof HTMLElement) {
        otherWrap.style.display = String(select?.value ?? "") === "__other__" ? "flex" : "none";
      }
    };

    const ensureRepeatableRows = (dialogBody, ruleIndex, baseName) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      const container = dialogBody.querySelector(`[data-edu-rule-container='${ruleIndex}']`);
      if (!(container instanceof HTMLElement)) return;

      const matchingRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName);
      const checkedRows = matchingRows.filter((row) => row.querySelector("input[type='checkbox']")?.checked);
      const blankRows = matchingRows.filter((row) => !row.querySelector("input[type='checkbox']")?.checked);

      if (checkedRows.length > 0 && blankRows.length === 0) {
        const nextRowIndex = container.querySelectorAll(".mythic-st-edu-row").length;
        const lastMatchingRow = matchingRows[matchingRows.length - 1] ?? null;
        if (lastMatchingRow instanceof HTMLElement) {
          lastMatchingRow.insertAdjacentHTML("afterend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        } else {
          container.insertAdjacentHTML("beforeend", createRowMarkup(ruleIndex, nextRowIndex, baseName));
        }
      }

      const refreshedBlankRows = Array.from(container.querySelectorAll(".mythic-st-edu-row"))
        .filter((row) => String(row.dataset.eduBaseName ?? "").trim() === baseName)
        .filter((row) => !row.querySelector("input[type='checkbox']")?.checked);
      while (refreshedBlankRows.length > 1) {
        const rowToRemove = refreshedBlankRows.pop();
        rowToRemove?.remove();
      }
    };

    const refreshState = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
        const required = Math.max(1, toNonNegativeWhole(rules[ruleIndex]?.count, 1));
        const selected = dialogBody.querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`).length;
        const status = dialogBody.querySelector(`[data-edu-count-status='${ruleIndex}']`);
        if (status) {
          status.textContent = `${selected}/${required} selected`;
          status.style.color = selected === required ? "rgba(140, 255, 170, 0.95)" : "rgba(255, 185, 120, 0.95)";
        }
      }
      const dialogApp = dialogBody.closest(".application, .window-app, .app") ?? dialogBody.parentElement;
      const applyButton = dialogApp?.querySelector("button[data-action='apply-edu']");
      if (applyButton instanceof HTMLButtonElement) {
        const canApply = isSelectionValid(dialogBody);
        applyButton.disabled = !canApply;
        applyButton.title = canApply ? "" : "Select exactly the required number of educations in each group.";
      }
    };

    const bindEducationRowEvents = (dialogBody) => {
      if (!(dialogBody instanceof HTMLElement)) return;
      dialogBody.querySelectorAll(".mythic-st-edu-row").forEach((row) => {
        if (!(row instanceof HTMLElement) || row.dataset.eduBound === "true") return;
        row.dataset.eduBound = "true";

        const checkbox = row.querySelector("input[type='checkbox']");
        const factionConfig = row.querySelector("[data-edu-config='faction']");
        const instrumentConfig = row.querySelector("[data-edu-config='instrument']");
        const factionSelect = row.querySelector("[data-edu-faction-select]");
        const factionOther = row.querySelector("[data-edu-faction-other]");
        const instrumentInput = row.querySelector("[data-edu-instrument-input]");

        const refreshRowState = () => {
          const isChecked = Boolean(checkbox?.checked);
          if (factionConfig instanceof HTMLElement) {
            factionConfig.style.display = isChecked ? "flex" : "none";
            toggleFactionOtherVisibility(row);
          }
          if (instrumentConfig instanceof HTMLElement) {
            instrumentConfig.style.display = isChecked ? "flex" : "none";
          }

          if (row.dataset.eduRepeatable === "true") {
            ensureRepeatableRows(dialogBody, Number(row.dataset.ruleIndex ?? 0), String(row.dataset.eduBaseName ?? "").trim());
            bindEducationRowEvents(dialogBody);
          }

          refreshState(dialogBody);
        };

        checkbox?.addEventListener("change", refreshRowState);
        factionSelect?.addEventListener("change", () => {
          toggleFactionOtherVisibility(row);
          refreshState(dialogBody);
        });
        factionOther?.addEventListener("input", () => refreshState(dialogBody));
        instrumentInput?.addEventListener("input", () => refreshState(dialogBody));
        refreshRowState();
      });
    };

    return foundry.applications.api.DialogV2.wait({
      window: {
        title: "Resolve Soldier Type Education Choices"
      },
      content: `
        <div class="mythic-modal-body mythic-st-edu-choice-dialog">
          <p><strong>${foundry.utils.escapeHTML(templateName)}</strong> includes education-choice grants.</p>
          <div style="max-height:65vh;overflow:auto;padding-right:4px">${blocks}</div>
        </div>
      `,
      render: (_event, dialog) => {
        const dialogElement = dialog?.element instanceof HTMLElement
          ? dialog.element
          : (dialog?.element?.[0] instanceof HTMLElement ? dialog.element[0] : null);
        const dialogBody = dialogElement?.querySelector(dialogBodySelector) ?? getDialogBody();
        if (!(dialogBody instanceof HTMLElement)) return;

        bindEducationRowEvents(dialogBody);
        refreshState(dialogBody);
      },
      buttons: [
        {
          action: "apply-edu",
          label: "Apply Choices",
          callback: () => {
            const selections = [];
            const dialogBody = getDialogBody();
            for (let ruleIndex = 0; ruleIndex < rules.length; ruleIndex += 1) {
              const rule = rules[ruleIndex] ?? {};
              const count = Math.max(1, toNonNegativeWhole(rule?.count, 1));
              const checked = Array.from((dialogBody ?? document).querySelectorAll(`input[name='mythic-st-edu-choice-${ruleIndex}']:checked`));
              if (checked.length !== count) {
                ui.notifications?.warn(`Education group ${ruleIndex + 1} requires exactly ${count} selections.`);
                return false;
              }
              const seen = new Set();
              const fieldset = (dialogBody ?? document).querySelector(`[data-edu-rule-index='${ruleIndex}']`);
              for (const box of checked) {
                const row = box.closest(".mythic-st-edu-row");
                const educationBaseName = String(row?.dataset.eduBaseName ?? box.value ?? "").trim();
                const metadata = {};

                if (this._isFactionEducationName(educationBaseName)) {
                  const factionSelect = row?.querySelector("[data-edu-faction-select]");
                  const factionOther = row?.querySelector("[data-edu-faction-other]");
                  const selectedFaction = String(factionSelect?.value ?? "").trim();
                  if (!selectedFaction) {
                    ui.notifications?.warn(`Choose a faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                  metadata.faction = selectedFaction === "__other__"
                    ? String(factionOther?.value ?? "").trim()
                    : selectedFaction;
                  if (!metadata.faction) {
                    ui.notifications?.warn(`Enter a custom faction for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                if (this._isInstrumentEducationName(educationBaseName)) {
                  metadata.instrument = String(row?.querySelector("[data-edu-instrument-input]")?.value ?? "").trim();
                  if (!metadata.instrument) {
                    ui.notifications?.warn(`Enter an instrument for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                    return false;
                  }
                }

                const eduName = this._resolveEducationVariantName(educationBaseName, metadata);
                if (!eduName) {
                  ui.notifications?.warn(`Could not resolve a final name for ${this._getEducationChoiceDisplayLabel(educationBaseName)}.`);
                  return false;
                }

                const marker = eduName.toLowerCase();
                if (marker && seen.has(marker)) {
                  ui.notifications?.warn("Duplicate resolved education selected in the same choice group.");
                  return false;
                }
                if (marker) seen.add(marker);
                selections.push({
                  ruleIndex,
                  educationBaseName,
                  educationName: eduName,
                  tier: String(fieldset?.getAttribute("data-edu-tier") ?? rule?.tier ?? "plus5"),
                  label: String(fieldset?.getAttribute("data-edu-label") ?? rule?.label ?? "Educations of choice"),
                  source: String(fieldset?.getAttribute("data-edu-source") ?? rule?.source ?? ""),
                  notes: String(fieldset?.getAttribute("data-edu-notes") ?? rule?.notes ?? ""),
                  metadata
                });
              }
            }
            return selections;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });
  },
};
