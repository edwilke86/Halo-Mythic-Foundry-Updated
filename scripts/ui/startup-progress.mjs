const ROOT_ID = "mythic-startup-progress";
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;
const DISMISS_SUCCESS_MS = 2200;
const DISMISS_FAILURE_MS = 7000;

function clampProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return MIN_PROGRESS;
  return Math.max(MIN_PROGRESS, Math.min(MAX_PROGRESS, Math.trunc(numeric)));
}

function getProgressContainer() {
  const interfaceElement = document.querySelector("#interface");
  if (interfaceElement instanceof HTMLElement) return interfaceElement;
  return document.body;
}

function buildProgressRoot() {
  const root = document.createElement("section");
  root.id = ROOT_ID;
  root.className = "mythic-startup-progress";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div class="mythic-startup-progress-shell">
      <div class="mythic-startup-progress-kicker">MYTHIC SYSTEM</div>
      <div class="mythic-startup-progress-label"></div>
      <div class="mythic-startup-progress-track" aria-hidden="true">
        <div class="mythic-startup-progress-fill"></div>
      </div>
      <div class="mythic-startup-progress-percent"></div>
    </div>
  `;
  return root;
}

class MythicStartupProgressController {
  constructor() {
    this.root = null;
    this.dismissTimer = null;
    this.removeTimer = null;
    this.active = false;
  }

  get isActive() {
    return this.active === true && this.root instanceof HTMLElement;
  }

  begin({ label = "Verifying combat package integrity...", progress = 5 } = {}) {
    if (this.isActive) {
      this.update({ label, progress });
      return false;
    }

    if (this.dismissTimer) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.removeTimer) {
      window.clearTimeout(this.removeTimer);
      this.removeTimer = null;
    }

    const container = getProgressContainer();
    this.root = document.getElementById(ROOT_ID) ?? buildProgressRoot();
    this.root.classList.remove("is-complete", "is-failed", "is-dismissing");
    if (!container.contains(this.root)) container.appendChild(this.root);
    this.active = true;
    this.update({ label, progress });
    return true;
  }

  update({ label = "", progress = null } = {}) {
    if (!this.isActive) return;

    if (label) {
      const labelElement = this.root.querySelector(".mythic-startup-progress-label");
      if (labelElement) labelElement.textContent = label;
    }

    if (progress !== null) {
      const nextProgress = clampProgress(progress);
      const fillElement = this.root.querySelector(".mythic-startup-progress-fill");
      const percentElement = this.root.querySelector(".mythic-startup-progress-percent");
      if (fillElement instanceof HTMLElement) fillElement.style.width = `${nextProgress}%`;
      if (percentElement) percentElement.textContent = `${nextProgress}%`;
    }
  }

  finish({ label = "Operational readiness confirmed.", progress = 100 } = {}) {
    if (!this.isActive) return;
    this.root.classList.add("is-complete");
    this.update({ label, progress });
    this.scheduleDismiss(DISMISS_SUCCESS_MS);
  }

  fail({ label = "Initialization completed with issues.", progress = 100 } = {}) {
    if (!this.isActive) return;
    this.root.classList.add("is-failed");
    this.update({ label, progress });
    this.scheduleDismiss(DISMISS_FAILURE_MS);
  }

  scheduleDismiss(delayMs) {
    if (this.dismissTimer) window.clearTimeout(this.dismissTimer);
    this.dismissTimer = window.setTimeout(() => {
      this.dismiss();
    }, Math.max(0, Number(delayMs) || 0));
  }

  dismiss() {
    if (this.dismissTimer) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (this.removeTimer) {
      window.clearTimeout(this.removeTimer);
      this.removeTimer = null;
    }

    if (!(this.root instanceof HTMLElement)) {
      this.active = false;
      return;
    }

    this.root.classList.add("is-dismissing");
    const root = this.root;
    this.removeTimer = window.setTimeout(() => {
      if (root.parentElement) root.parentElement.removeChild(root);
      this.removeTimer = null;
    }, 220);
    this.root = null;
    this.active = false;
  }
}

export const mythicStartupProgress = new MythicStartupProgressController();
