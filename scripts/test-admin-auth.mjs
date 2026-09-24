/**
 * scripts/test-admin-auth.mjs
 *
 * Regression guard for the cookie-forwarding fix in src/proxy.ts.
 * Uses Playwright to perform a REAL browser login so the test never
 * needs to know or guess Supabase's internal cookie serialisation format.
 *
 * What it tests:
 *   1. LOGIN UI — navigates to /admin/login, fills email + password,
 *      submits, and waits for the redirect to /admin/dashboard.
 *      (Catches login-form regressions, not just middleware bugs.)
 *   2. MIDDLEWARE COOKIE-FORWARDING — extracts browser cookies via
 *      context.cookies() and passes them on 7 admin page routes +
 *      /api/admin/settings, asserting none are unauthorised.
 *   3. UNAUTHENTICATED GUARDS — verifies that requests WITHOUT cookies
 *      are still blocked (401 for API, redirect for pages).
 *
 * Usage:
 *   node scripts/test-admin-auth.mjs
 *   BASE_URL=https://your-staging-url node scripts/test-admin-auth.mjs
 *
 * Requires in .env.local (never committed):
 *   TEST_ADMIN_EMAIL=you@example.com
 *   TEST_ADMIN_PASSWORD=yourpassword
 *
 * Requires (installed as devDependency):
 *   @playwright/test  (browser binary: npx playwright install chromium)
 */

import { chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env.local (no external deps) ─────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
try {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* rely on real env in CI */ }

const BASE_URL    = process.env.BASE_URL          || "http://localhost:3000";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASS  = process.env.TEST_ADMIN_PASSWORD;

// ── Helpers ─────────────────────────────────────────────────────────────────
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
}

/** Convert Playwright cookies array → Cookie header string */
function cookieHeader(cookies) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function get(path, cookieStr = "") {
  const res = await fetch(BASE_URL + path, {
    method: "GET",
    redirect: "manual",
    headers: cookieStr ? { cookie: cookieStr } : {},
  });
  return { status: res.status, location: res.headers.get("location"), res };
}

async function postJson(path, body, cookieStr = "") {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(cookieStr ? { cookie: cookieStr } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, res };
}

// ── Phase 1: Real browser login via Playwright ───────────────────────────────
async function loginWithBrowser() {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    throw new Error(
      "TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD must be set in .env.local.\n" +
      "These are never committed to git."
    );
  }

  console.log("Launching headless Chromium …");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page    = await context.newPage();

  // Navigate to the login page
  console.log(`  → GET ${BASE_URL}/admin/login`);
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });

  // Fill email & password
  await page.fill('input[type="email"]',    ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASS);

  // Submit and wait for navigation to /admin/dashboard
  console.log("  → Submitting login form …");
  await Promise.all([
    page.waitForURL("**/admin/dashboard", { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);

  console.log(`  ✓ Redirected to: ${page.url()}`);
  assert(
    page.url().includes("/admin/dashboard"),
    `Login did not redirect to /admin/dashboard. Current URL: ${page.url()}`
  );

  // Extract the cookies the browser now holds (these are real @supabase/ssr cookies)
  const cookies = await context.cookies();
  await browser.close();

  console.log(`  ✓ Extracted ${cookies.length} cookie(s) from browser context`);
  return cookieHeader(cookies);
}

// ── Phase 2: Fetch-based assertions ─────────────────────────────────────────
const ADMIN_PAGE_ROUTES = [
  "/admin/dashboard",
  "/admin/bookings",
  "/admin/guests",
  "/admin/rooms",
  "/admin/payments",
  "/admin/reviews",
  "/admin/settings",
];

async function runAssertions(cookieStr) {
  // 2a. Authenticated admin pages must NOT redirect to /admin/login
  console.log("\n── Admin page routes (must not redirect to /admin/login) ──────────");
  let pageChecked = 0;
  for (const route of ADMIN_PAGE_ROUTES) {
    const { status, location } = await get(route, cookieStr);
    if (location?.includes("/admin/login")) {
      throw new Error(
        `${route} redirected to /admin/login for an authenticated user.\n` +
        "Likely cause: a redirect path in proxy.ts forgot to call copyCookies()."
      );
    }
    const ok =
      status === 200 ||
      (status >= 300 && status < 400 && !location?.includes("/admin/login"));
    assert(ok, `${route} returned unexpected ${status} ${location ?? ""}`);
    console.log(`  [PASS] ${route} → ${status}${location ? " → " + location : ""}`);
    pageChecked++;
  }
  assert(pageChecked >= 3, `Expected >=3 admin page routes checked, got ${pageChecked}`);

  // 2b. Authenticated API route must NOT be 401
  console.log("\n── Admin API route (must not be 401 when authenticated) ───────────");
  const { status: apiStatus } = await get("/api/admin/settings", cookieStr);
  assert(
    apiStatus !== 401,
    `/api/admin/settings returned 401 for authenticated user — proxy API guard dropped cookies!`
  );
  console.log(`  [PASS] GET /api/admin/settings → ${apiStatus} (not 401)`);

  // 2c. Unauthenticated API guard must be blocked (401 auth OR 403 CSRF).
  // CSRF origin validation was added after this test was written and fires
  // BEFORE the auth check. A bare Node.js fetch carries no Origin header, so
  // validateOrigin() returns 403 — which is equally "blocked". Both statuses
  // confirm an unauthenticated/cross-origin request cannot reach the handler.
  console.log("\n── Unauthenticated API guard (must return 401 or 403) ─────────────────────");
  const { status: unauthedApi } = await postJson("/api/admin/bookings/action", {}, "");
  assert(
    unauthedApi === 401 || unauthedApi === 403,
    `Expected 401 or 403 for unauthenticated /api/admin/bookings/action, got ${unauthedApi}`
  );
  console.log(`  [PASS] Unauthenticated POST /api/admin/bookings/action → ${unauthedApi} (blocked)`);

  // 2d. Unauthenticated page guard must redirect to /admin/login
  console.log("\n── Unauthenticated page guard (must redirect to /admin/login) ──────");
  const { status: unauthedPage, location: loginLoc } = await get("/admin/dashboard", "");
  assert(
    loginLoc?.includes("/admin/login"),
    `Expected redirect to /admin/login for unauthenticated /admin/dashboard, got ${unauthedPage} ${loginLoc}`
  );
  console.log(`  [PASS] Unauthenticated GET /admin/dashboard → ${unauthedPage} → ${loginLoc}`);
}

// ── Entry point ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`Admin auth regression test against: ${BASE_URL}\n`);

  // Step 1 – real browser login (tests the UI and obtains real cookies)
  const cookieStr = await loginWithBrowser();

  // Step 2 – fetch-based middleware assertions using those cookies
  await runAssertions(cookieStr);

  console.log("\nALL ASSERTIONS PASSED — login UI + auth middleware cookie-forwarding is healthy.\n");
}

main().catch((err) => {
  console.error("\n" + err.message + "\n");
  process.exit(1);
});
