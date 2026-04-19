import { chromium } from "playwright";

const BASE_URL = process.env.FOUNDRY_URL ?? "http://localhost:30000/game";

// These must match the option labels on the Foundry join screen.
const USERS_IN_ORDER = [
  "Visual Studio (Player)",
  "Visual Studio (Trusted Player)",
  "Visual Studio (Assistant)",
  "Visual Studio (GM)",
];

function normalizeUrl(url) {
  // Allow passing localhost:30000/game without scheme.
  if (/^https?:\/\//i.test(url)) return url;
  return `http://${url}`;
}

async function gotoJoinScreen(page) {
  const target = normalizeUrl(BASE_URL);
  await page.goto(target, { waitUntil: "domcontentloaded" });
  // Foundry can redirect to /join (or similar) before the join form appears.
  await page.waitForLoadState("domcontentloaded");
}

async function findUserSelect(page) {
  // Foundry join screen has historically used a select for user id.
  const candidates = [
    'select[name="userid"]',
    "select#join-user",
    'select[name*="user"]',
    "select",
  ];

  for (const selector of candidates) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      // Filter out non-visible selects (some UIs keep hidden templates).
      if (await loc.isVisible().catch(() => false)) return loc;
    }
  }

  throw new Error("Could not find a user select element on the join screen.");
}

async function clickJoin(page) {
  const candidates = [
    'button[type="submit"]',
    'button[name="join"]',
    "button:has-text(\"Join\")",
    "button:has-text(\"Log In\")",
  ];

  for (const selector of candidates) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      if (await loc.isVisible().catch(() => false)) {
        await loc.click();
        return;
      }
    }
  }

  throw new Error("Could not find a Join/Log In button on the join screen.");
}

async function waitForGameReady(page, expectedUserLabel) {
  // Use the Foundry runtime if available; this is the most stable signal.
  await page.waitForFunction(() => {
    // @ts-ignore
    return typeof window !== "undefined" && !!window.game && !!window.game.user;
  });

  await page.waitForFunction(
    (expected) => {
      // @ts-ignore
      return !!window.game?.user?.name && window.game.user.name === expected;
    },
    expectedUserLabel,
  );
}

async function logout(page) {
  // Try the Settings sidebar tab first (stable across versions).
  const settingsTab = page.locator('.tabs [data-tab="settings"], .tabs [data-tab="settings"] a').first();
  if (await settingsTab.count()) {
    await settingsTab.click().catch(() => {});
  }

  const logoutButton = page
    .getByRole("button", { name: /log out|logout/i })
    .first();

  if (await logoutButton.count()) {
    await logoutButton.click();
    return;
  }

  // Fallback: try common action attributes.
  const fallback = page.locator('button[data-action="logout"], a[data-action="logout"]').first();
  if (await fallback.count()) {
    await fallback.click();
    return;
  }

  throw new Error("Could not find a Log Out button after joining the game.");
}

async function waitForJoinForm(page) {
  // Look for a user select returning; that’s usually the join screen.
  const select = await findUserSelect(page);
  await select.waitFor({ state: "visible" });
}

async function loginOnce(page, userLabel) {
  await gotoJoinScreen(page);

  const userSelect = await findUserSelect(page);
  await userSelect.selectOption({ label: userLabel });

  // Passwords are blank; if a password input exists, ensure it is empty.
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  if (await passwordInput.count()) {
    await passwordInput.fill("");
  }

  await clickJoin(page);
  await waitForGameReady(page, userLabel);
}

async function main() {
  const browser = await chromium.launch({
    headless: process.env.HEADED === "0" ? true : false,
    slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 100,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (let i = 0; i < USERS_IN_ORDER.length; i++) {
      const userLabel = USERS_IN_ORDER[i];
      console.log(`[foundry-e2e] Login as: ${userLabel}`);
      await loginOnce(page, userLabel);

      const isLast = i === USERS_IN_ORDER.length - 1;
      if (!isLast) {
        console.log(`[foundry-e2e] Logout: ${userLabel}`);
        await logout(page);
        await waitForJoinForm(page);
      }
    }

    console.log(`[foundry-e2e] Final session should be: ${USERS_IN_ORDER.at(-1)}`);
    // One last confirmation using Foundry runtime:
    await waitForGameReady(page, USERS_IN_ORDER.at(-1));
    console.log("[foundry-e2e] Confirmed final active session is GM.");
  } finally {
    // Leave the browser open for visual confirmation unless explicitly closed.
    if (process.env.KEEP_OPEN !== "1") {
      await browser.close();
    }
  }
}

main().catch((err) => {
  console.error("[foundry-e2e] FAILED:", err);
  process.exitCode = 1;
});

