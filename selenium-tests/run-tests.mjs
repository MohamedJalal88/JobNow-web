/**
 * JobNow E2E Selenium Test Suite
 * Tests the live app at https://jobnow.dailywage.workers.dev
 * Generates a detailed Excel report on completion.
 */

import { Builder, By, until, Key } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://jobnow.dailywage.workers.dev";
const WORKER_PHONE = "8870730454";
const WORKER_PASSWORD = "jalal123";
const CONTRACTOR_PHONE = "8220983729";
const CONTRACTOR_PASSWORD = "apsar123";
const TIMEOUT = 20000;

// ─── Result store ─────────────────────────────────────────────────────────────
const results = [];
let driver;

function logResult(id, category, name, description, expected, actual, status, notes = "") {
  const ts = new Date().toLocaleTimeString("en-IN");
  results.push({ id, category, name, description, expected, actual, status, notes, timestamp: ts });
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⚠️";
  console.log(`  ${icon} [${id}] ${name}: ${status}${notes ? " — " + notes : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeGet(url) {
  await driver.get(url);
  await sleep(3000);
}

async function waitForUrl(partial, timeout = TIMEOUT) {
  await driver.wait(async () => {
    const u = await driver.getCurrentUrl();
    return u.includes(partial);
  }, timeout);
}

async function findEl(locator, timeout = 10000) {
  return driver.wait(until.elementLocated(locator), timeout);
}

async function typeInto(locator, value) {
  const el = await findEl(locator);
  await el.clear();
  await el.sendKeys(value);
  return el;
}

async function getText(locator) {
  try {
    const el = await findEl(locator, 5000);
    return await el.getText();
  } catch {
    return "";
  }
}

// ─── Login helper ─────────────────────────────────────────────────────────────
async function performLogin(role, phone, password) {
  await safeGet(`${BASE_URL}/login?role=${role}`);
  await sleep(2000);

  // Try to fill phone
  const phoneLocators = [
    By.css("input[type='tel']"),
    By.css("input[placeholder*='phone']"),
    By.css("input[placeholder*='Phone']"),
    By.css("input[id='phone']"),
    By.css("input[name='phone']"),
    By.css("input[placeholder*='98765']"),
    By.css("input[placeholder*='43210']"),
  ];

  let phoneEl = null;
  for (const loc of phoneLocators) {
    try {
      phoneEl = await driver.wait(until.elementLocated(loc), 4000);
      break;
    } catch {}
  }

  if (!phoneEl) {
    // Try clicking first input on page
    const inputs = await driver.findElements(By.css("input"));
    if (inputs.length > 0) phoneEl = inputs[0];
  }

  if (phoneEl) {
    await phoneEl.click();
    await sleep(300);
    await phoneEl.sendKeys(Key.CONTROL + "a");
    await phoneEl.sendKeys(Key.DELETE);
    await phoneEl.sendKeys(phone);
    await sleep(500);
  }

  // Password field
  const pwdLocators = [
    By.css("input[type='password']"),
    By.css("input[id='password']"),
    By.css("input[name='password']"),
  ];

  let pwdEl = null;
  for (const loc of pwdLocators) {
    try {
      pwdEl = await driver.wait(until.elementLocated(loc), 4000);
      break;
    } catch {}
  }

  if (pwdEl) {
    await pwdEl.click();
    await sleep(300);
    await pwdEl.sendKeys(Key.CONTROL + "a");
    await pwdEl.sendKeys(Key.DELETE);
    await pwdEl.sendKeys(password);
    await sleep(500);
  }

  // Submit
  const btnLocators = [
    By.css("button[type='submit']"),
    By.xpath("//button[contains(text(),'Log in')]"),
    By.xpath("//button[contains(text(),'Sign in')]"),
    By.xpath("//button[contains(text(),'Login')]"),
  ];

  let submitted = false;
  for (const loc of btnLocators) {
    try {
      const btn = await driver.wait(until.elementLocated(loc), 3000);
      await btn.click();
      submitted = true;
      break;
    } catch {}
  }

  if (!submitted && pwdEl) {
    await pwdEl.sendKeys(Key.ENTER);
  }

  await sleep(5000);
  return await driver.getCurrentUrl();
}

async function performLogout() {
  try {
    // Try to find a settings/logout button
    const logoutLocators = [
      By.xpath("//*[contains(text(),'Sign out')]"),
      By.xpath("//*[contains(text(),'Logout')]"),
      By.xpath("//*[contains(text(),'Log out')]"),
      By.css("[data-logout]"),
      By.css("[aria-label*='logout']"),
      By.css("[aria-label*='sign out']"),
    ];
    for (const loc of logoutLocators) {
      try {
        const el = await driver.findElement(loc);
        await el.click();
        await sleep(2000);
        await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
        return true;
      } catch {}
    }
    // Navigate away as fallback & clear storage
    await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
    await safeGet(`${BASE_URL}/welcome`);
    return true;
  } catch {
    try {
      await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
    } catch {}
    await safeGet(`${BASE_URL}/welcome`);
    return false;
  }
}

// ─── Test Suites ──────────────────────────────────────────────────────────────

async function testHomepage() {
  console.log("\n📋 Suite 1: Homepage & Public Navigation");

  // TC-01: Homepage loads
  try {
    await safeGet(BASE_URL);
    const title = await driver.getTitle();
    const url = await driver.getCurrentUrl();
    const loaded = url.includes("jobnow") || url.includes("dailywage");
    logResult("TC-01", "Homepage", "Homepage Loads", "Navigate to root URL", "Page loads successfully", `URL: ${url}, Title: ${title}`, loaded ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-01", "Homepage", "Homepage Loads", "Navigate to root URL", "Page loads successfully", e.message, "FAIL");
  }

  // TC-02: Welcome page accessible
  try {
    await safeGet(`${BASE_URL}/welcome`);
    const url = await driver.getCurrentUrl();
    logResult("TC-02", "Homepage", "Welcome Page Accessible", "Navigate to /welcome", "Welcome page loads", `URL: ${url}`, url.includes("welcome") ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-02", "Homepage", "Welcome Page Accessible", "Navigate to /welcome", "Welcome page loads", e.message, "FAIL");
  }

  // TC-03: Login/Auth choice page accessible
  try {
    await safeGet(`${BASE_URL}/login-choice`);
    const url = await driver.getCurrentUrl();
    logResult("TC-03", "Homepage", "Login Choice Page", "Navigate to /login-choice", "Login choice page loads", `URL: ${url}`, url.includes("login") || url.includes("welcome") ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-03", "Homepage", "Login Choice Page", "Navigate to /login-choice", "Login choice page loads", e.message, "FAIL");
  }

  // TC-04: Auth choice page accessible
  try {
    await safeGet(`${BASE_URL}/auth-choice`);
    const url = await driver.getCurrentUrl();
    logResult("TC-04", "Homepage", "Auth Choice Page", "Navigate to /auth-choice", "Auth choice page loads", `URL: ${url}`, url.includes("auth") || url.includes("welcome") ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-04", "Homepage", "Auth Choice Page", "Navigate to /auth-choice", "Auth choice page loads", e.message, "FAIL");
  }

  // TC-05: Worker login page accessible
  try {
    await safeGet(`${BASE_URL}/login?role=worker`);
    const url = await driver.getCurrentUrl();
    logResult("TC-05", "Homepage", "Worker Login Page", "Navigate to /login?role=worker", "Worker login page loads", `URL: ${url}`, url.includes("login") ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-05", "Homepage", "Worker Login Page", "Navigate to /login?role=worker", "Worker login page loads", e.message, "FAIL");
  }

  // TC-06: Contractor login page accessible
  try {
    await safeGet(`${BASE_URL}/login?role=contractor`);
    const url = await driver.getCurrentUrl();
    logResult("TC-06", "Homepage", "Contractor Login Page", "Navigate to /login?role=contractor", "Contractor login page loads", `URL: ${url}`, url.includes("login") ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-06", "Homepage", "Contractor Login Page", "Navigate to /login?role=contractor", "Contractor login page loads", e.message, "FAIL");
  }

  // TC-07: Login form has phone and password inputs
  try {
    await safeGet(`${BASE_URL}/login?role=worker`);
    await sleep(2000);
    let hasPhone = false;
    let hasPwd = false;
    const allInputs = await driver.findElements(By.css("input"));
    for (const input of allInputs) {
      const t = (await input.getAttribute("type") || "").toLowerCase();
      const p = (await input.getAttribute("placeholder") || "").toLowerCase();
      if (t === "tel" || p.includes("phone") || p.includes("98765")) hasPhone = true;
      if (t === "password") hasPwd = true;
    }
    const pass = hasPhone && hasPwd;
    logResult("TC-07", "Homepage", "Login Form Fields Present", "Check login form has phone + password inputs", "Both phone and password inputs present", `Phone: ${hasPhone}, Password: ${hasPwd}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-07", "Homepage", "Login Form Fields Present", "Check login form has phone + password inputs", "Both phone and password inputs present", e.message, "FAIL");
  }
}

async function testWorkerAuth() {
  console.log("\n📋 Suite 2: Worker Authentication");

  // TC-08: Worker valid login
  try {
    const finalUrl = await performLogin("worker", WORKER_PHONE, WORKER_PASSWORD);
    const success = finalUrl.includes("/worker");
    logResult("TC-08", "Worker Auth", "Worker Valid Login", `Login with phone: ${WORKER_PHONE}`, "Redirects to /worker dashboard", `Final URL: ${finalUrl}`, success ? "PASS" : "FAIL", success ? "" : "Still on login or unexpected URL");
  } catch (e) {
    logResult("TC-08", "Worker Auth", "Worker Valid Login", `Login with phone: ${WORKER_PHONE}`, "Redirects to /worker dashboard", e.message, "FAIL");
  }

  // TC-09: Worker dashboard loads after login
  try {
    const url = await driver.getCurrentUrl();
    const onDash = url.includes("/worker");
    let contentLen = 0;
    if (onDash) {
      await sleep(2000);
      try {
        const body = await driver.findElement(By.css("body"));
        const txt = await body.getText();
        contentLen = txt.length;
      } catch { contentLen = 0; }
    }
    logResult("TC-09", "Worker Auth", "Worker Dashboard Loads", "Check dashboard content after login", "Dashboard has visible content", `URL: ${url}, Content length: ${contentLen}`, onDash && contentLen > 100 ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-09", "Worker Auth", "Worker Dashboard Loads", "Check dashboard content after login", "Dashboard has visible content", e.message, "FAIL");
  }

  // TC-10: Worker invalid login (wrong password)
  try {
    await performLogout();
    const finalUrl = await performLogin("worker", WORKER_PHONE, "wrongpassword999");
    const staysOnLogin = finalUrl.includes("login") || !finalUrl.includes("/worker");
    logResult("TC-10", "Worker Auth", "Worker Invalid Login Blocked", `Login with wrong password`, "Stays on login page or shows error", `Final URL: ${finalUrl}`, staysOnLogin ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-10", "Worker Auth", "Worker Invalid Login Blocked", "Login with wrong password", "Stays on login page or shows error", e.message, "FAIL");
  }

  // TC-11: Worker invalid login (wrong phone)
  try {
    await performLogout();
    const finalUrl = await performLogin("worker", "9999999999", "wrongpass");
    const staysOnLogin = finalUrl.includes("login") || !finalUrl.includes("/worker");
    logResult("TC-11", "Worker Auth", "Worker Unknown Phone Blocked", "Login with non-existent phone", "Stays on login page or shows error", `Final URL: ${finalUrl}`, staysOnLogin ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-11", "Worker Auth", "Worker Unknown Phone Blocked", "Login with non-existent phone", "Stays on login page or shows error", e.message, "FAIL");
  }
}

async function testWorkerDashboard() {
  console.log("\n📋 Suite 3: Worker Dashboard Features");

  // Login first
  await performLogin("worker", WORKER_PHONE, WORKER_PASSWORD);
  const currentUrl = await driver.getCurrentUrl();
  const loggedIn = currentUrl.includes("/worker");

  if (!loggedIn) {
    logResult("TC-12", "Worker Dashboard", "Worker Dashboard Access", "Access worker dashboard", "Worker dashboard accessible", `URL: ${currentUrl}`, "FAIL", "Could not login as worker — skipping dashboard tests");
    logResult("TC-13", "Worker Dashboard", "Worker Jobs Page", "Navigate to /worker/jobs", "Jobs page loads", "Skipped — login failed", "SKIP");
    logResult("TC-14", "Worker Dashboard", "Worker Profile Page", "Navigate to /worker/profile", "Profile page loads", "Skipped — login failed", "SKIP");
    logResult("TC-15", "Worker Dashboard", "Worker Notifications Page", "Navigate to /worker/notifications", "Notifications page loads", "Skipped — login failed", "SKIP");
    logResult("TC-16", "Worker Dashboard", "Worker Messages Page", "Navigate to /worker/messages", "Messages page loads", "Skipped — login failed", "SKIP");
    logResult("TC-17", "Worker Dashboard", "Worker Earnings Page", "Navigate to /worker/earnings", "Earnings page loads", "Skipped — login failed", "SKIP");
    logResult("TC-18", "Worker Dashboard", "Worker Settings Page", "Navigate to /worker/settings", "Settings page loads", "Skipped — login failed", "SKIP");
    return;
  }

  // TC-12: Worker dashboard accessible
  logResult("TC-12", "Worker Dashboard", "Worker Dashboard Access", "Access worker dashboard", "Worker dashboard accessible", `URL: ${currentUrl}`, "PASS");

  // TC-13: Worker Jobs page
  try {
    await safeGet(`${BASE_URL}/worker/jobs`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker/jobs") || url.includes("/worker");
    logResult("TC-13", "Worker Dashboard", "Worker Jobs Page", "Navigate to /worker/jobs", "Jobs page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-13", "Worker Dashboard", "Worker Jobs Page", "Navigate to /worker/jobs", "Jobs page loads", e.message, "FAIL");
  }

  // TC-14: Worker Profile page
  try {
    await safeGet(`${BASE_URL}/worker/profile`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-14", "Worker Dashboard", "Worker Profile Page", "Navigate to /worker/profile", "Profile page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-14", "Worker Dashboard", "Worker Profile Page", "Navigate to /worker/profile", "Profile page loads", e.message, "FAIL");
  }

  // TC-15: Worker Notifications page
  try {
    await safeGet(`${BASE_URL}/worker/notifications`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-15", "Worker Dashboard", "Worker Notifications Page", "Navigate to /worker/notifications", "Notifications page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-15", "Worker Dashboard", "Worker Notifications Page", "Navigate to /worker/notifications", "Notifications page loads", e.message, "FAIL");
  }

  // TC-16: Worker Messages page
  try {
    await safeGet(`${BASE_URL}/worker/messages`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-16", "Worker Dashboard", "Worker Messages Page", "Navigate to /worker/messages", "Messages page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-16", "Worker Dashboard", "Worker Messages Page", "Navigate to /worker/messages", "Messages page loads", e.message, "FAIL");
  }

  // TC-17: Worker Earnings page
  try {
    await safeGet(`${BASE_URL}/worker/earnings`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-17", "Worker Dashboard", "Worker Earnings Page", "Navigate to /worker/earnings", "Earnings page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-17", "Worker Dashboard", "Worker Earnings Page", "Navigate to /worker/earnings", "Earnings page loads", e.message, "FAIL");
  }

  // TC-18: Worker Settings page
  try {
    await safeGet(`${BASE_URL}/worker/settings`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-18", "Worker Dashboard", "Worker Settings Page", "Navigate to /worker/settings", "Settings page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-18", "Worker Dashboard", "Worker Settings Page", "Navigate to /worker/settings", "Settings page loads", e.message, "FAIL");
  }

  // TC-19: Worker Accepted Jobs page
  try {
    await safeGet(`${BASE_URL}/worker/accepted`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-19", "Worker Dashboard", "Worker Accepted Jobs Page", "Navigate to /worker/accepted", "Accepted jobs page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-19", "Worker Dashboard", "Worker Accepted Jobs Page", "Navigate to /worker/accepted", "Accepted jobs page loads", e.message, "FAIL");
  }

  // TC-20: Worker History page
  try {
    await safeGet(`${BASE_URL}/worker/history`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-20", "Worker Dashboard", "Worker History Page", "Navigate to /worker/history", "History page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-20", "Worker Dashboard", "Worker History Page", "Navigate to /worker/history", "History page loads", e.message, "FAIL");
  }

  // TC-21: Worker cannot access contractor routes
  try {
    await safeGet(`${BASE_URL}/contractor`);
    const url = await driver.getCurrentUrl();
    const blocked = !url.includes("/contractor") || url.includes("login") || url.includes("welcome");
    logResult("TC-21", "Worker Dashboard", "Worker Blocked from Contractor Routes", "Navigate to /contractor as worker", "Redirected away from contractor area", `Final URL: ${url}`, blocked ? "PASS" : "FAIL", blocked ? "" : "Worker was allowed into contractor area (access control failure)");
  } catch (e) {
    logResult("TC-21", "Worker Dashboard", "Worker Blocked from Contractor Routes", "Navigate to /contractor as worker", "Redirected away from contractor area", e.message, "FAIL");
  }

  // TC-22: Worker Help page
  try {
    await safeGet(`${BASE_URL}/worker/help`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-22", "Worker Dashboard", "Worker Help Page", "Navigate to /worker/help", "Help page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-22", "Worker Dashboard", "Worker Help Page", "Navigate to /worker/help", "Help page loads", e.message, "FAIL");
  }
}

async function testContractorAuth() {
  console.log("\n📋 Suite 4: Contractor Authentication");

  // Log out worker session from previous suite first
  await performLogout();

  // TC-23: Contractor valid login
  try {
    const finalUrl = await performLogin("contractor", CONTRACTOR_PHONE, CONTRACTOR_PASSWORD);
    const success = finalUrl.includes("/contractor");
    logResult("TC-23", "Contractor Auth", "Contractor Valid Login", `Login with phone: ${CONTRACTOR_PHONE}`, "Redirects to /contractor dashboard", `Final URL: ${finalUrl}`, success ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-23", "Contractor Auth", "Contractor Valid Login", `Login with phone: ${CONTRACTOR_PHONE}`, "Redirects to /contractor dashboard", e.message, "FAIL");
  }

  // TC-24: Contractor dashboard loads
  try {
    const url = await driver.getCurrentUrl();
    const onDash = url.includes("/contractor");
    logResult("TC-24", "Contractor Auth", "Contractor Dashboard Loads", "Check dashboard after login", "Dashboard page visible", `URL: ${url}`, onDash ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-24", "Contractor Auth", "Contractor Dashboard Loads", "Check dashboard after login", "Dashboard page visible", e.message, "FAIL");
  }

  // TC-25: Contractor invalid login
  try {
    await performLogout();
    const finalUrl = await performLogin("contractor", CONTRACTOR_PHONE, "wrongpassword999");
    const blocked = finalUrl.includes("login") || !finalUrl.includes("/contractor");
    logResult("TC-25", "Contractor Auth", "Contractor Invalid Login Blocked", "Login with wrong password", "Stays on login page", `Final URL: ${finalUrl}`, blocked ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-25", "Contractor Auth", "Contractor Invalid Login Blocked", "Login with wrong password", "Stays on login page", e.message, "FAIL");
  }
}

async function testContractorDashboard() {
  console.log("\n📋 Suite 5: Contractor Dashboard Features");

  await performLogin("contractor", CONTRACTOR_PHONE, CONTRACTOR_PASSWORD);
  const currentUrl = await driver.getCurrentUrl();
  const loggedIn = currentUrl.includes("/contractor");

  if (!loggedIn) {
    ["TC-26","TC-27","TC-28","TC-29","TC-30","TC-31","TC-32","TC-33","TC-34","TC-35"].forEach((id, i) => {
      logResult(id, "Contractor Dashboard", `Test ${i+1}`, "N/A", "N/A", "Skipped — contractor login failed", "SKIP");
    });
    return;
  }

  // TC-26: Contractor Home/Index
  logResult("TC-26", "Contractor Dashboard", "Contractor Dashboard Access", "Access contractor dashboard", "Contractor dashboard accessible", `URL: ${currentUrl}`, "PASS");

  // TC-27: Contractor Post Job page
  try {
    await safeGet(`${BASE_URL}/contractor/post`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-27", "Contractor Dashboard", "Contractor Post Job Page", "Navigate to /contractor/post", "Post job page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-27", "Contractor Dashboard", "Contractor Post Job Page", "Navigate to /contractor/post", "Post job page loads", e.message, "FAIL");
  }

  // TC-28: Post Job form has required fields
  try {
    await safeGet(`${BASE_URL}/contractor/post`);
    await sleep(2000);
    const inputs = await driver.findElements(By.css("input, textarea, select"));
    const hasFormFields = inputs.length >= 3;
    logResult("TC-28", "Contractor Dashboard", "Post Job Form Fields", "Check post job form has inputs", "Form has at least 3 input fields", `Input count: ${inputs.length}`, hasFormFields ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-28", "Contractor Dashboard", "Post Job Form Fields", "Check post job form has inputs", "Form has at least 3 input fields", e.message, "FAIL");
  }

  // TC-29: Contractor Applications page
  try {
    await safeGet(`${BASE_URL}/contractor/applications`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-29", "Contractor Dashboard", "Contractor Applications Page", "Navigate to /contractor/applications", "Applications page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-29", "Contractor Dashboard", "Contractor Applications Page", "Navigate to /contractor/applications", "Applications page loads", e.message, "FAIL");
  }

  // TC-30: Contractor Active Jobs page
  try {
    await safeGet(`${BASE_URL}/contractor/active`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-30", "Contractor Dashboard", "Contractor Active Jobs Page", "Navigate to /contractor/active", "Active jobs page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-30", "Contractor Dashboard", "Contractor Active Jobs Page", "Navigate to /contractor/active", "Active jobs page loads", e.message, "FAIL");
  }

  // TC-31: Contractor Payments page
  try {
    await safeGet(`${BASE_URL}/contractor/payments`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-31", "Contractor Dashboard", "Contractor Payments Page", "Navigate to /contractor/payments", "Payments page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-31", "Contractor Dashboard", "Contractor Payments Page", "Navigate to /contractor/payments", "Payments page loads", e.message, "FAIL");
  }

  // TC-32: Contractor Analytics page
  try {
    await safeGet(`${BASE_URL}/contractor/analytics`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-32", "Contractor Dashboard", "Contractor Analytics Page", "Navigate to /contractor/analytics", "Analytics page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-32", "Contractor Dashboard", "Contractor Analytics Page", "Navigate to /contractor/analytics", "Analytics page loads", e.message, "FAIL");
  }

  // TC-33: Contractor Messages page
  try {
    await safeGet(`${BASE_URL}/contractor/messages`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-33", "Contractor Dashboard", "Contractor Messages Page", "Navigate to /contractor/messages", "Messages page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-33", "Contractor Dashboard", "Contractor Messages Page", "Navigate to /contractor/messages", "Messages page loads", e.message, "FAIL");
  }

  // TC-34: Contractor Profile page
  try {
    await safeGet(`${BASE_URL}/contractor/profile`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-34", "Contractor Dashboard", "Contractor Profile Page", "Navigate to /contractor/profile", "Profile page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-34", "Contractor Dashboard", "Contractor Profile Page", "Navigate to /contractor/profile", "Profile page loads", e.message, "FAIL");
  }

  // TC-35: Contractor cannot access worker routes
  try {
    await safeGet(`${BASE_URL}/worker`);
    const url = await driver.getCurrentUrl();
    const blocked = !url.includes("/worker") || url.includes("login") || url.includes("welcome");
    logResult("TC-35", "Contractor Dashboard", "Contractor Blocked from Worker Routes", "Navigate to /worker as contractor", "Redirected away from worker area", `Final URL: ${url}`, blocked ? "PASS" : "FAIL", blocked ? "" : "Contractor was allowed into worker area (access control failure)");
  } catch (e) {
    logResult("TC-35", "Contractor Dashboard", "Contractor Blocked from Worker Routes", "Navigate to /worker as contractor", "Redirected away from worker area", e.message, "FAIL");
  }

  // TC-36: Contractor Workers list page
  try {
    await safeGet(`${BASE_URL}/contractor/workers`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-36", "Contractor Dashboard", "Contractor Workers Page", "Navigate to /contractor/workers", "Workers list page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-36", "Contractor Dashboard", "Contractor Workers Page", "Navigate to /contractor/workers", "Workers list page loads", e.message, "FAIL");
  }

  // TC-37: Contractor Settings page
  try {
    await safeGet(`${BASE_URL}/contractor/settings`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/contractor");
    logResult("TC-37", "Contractor Dashboard", "Contractor Settings Page", "Navigate to /contractor/settings", "Settings page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-37", "Contractor Dashboard", "Contractor Settings Page", "Navigate to /contractor/settings", "Settings page loads", e.message, "FAIL");
  }
}

async function testProtectedRoutes() {
  console.log("\n📋 Suite 6: Protected Routes & Access Control");

  // Clear session first by navigating to welcome and performing logout
  await performLogout();
  await sleep(1000);

  // TC-38: Unauthenticated access to worker dashboard is blocked
  try {
    await safeGet(`${BASE_URL}/worker`);
    const url = await driver.getCurrentUrl();
    const blocked = !url.includes("/worker") || url.includes("login") || url.includes("welcome");
    logResult("TC-38", "Access Control", "Unauthenticated Worker Block", "Access /worker without login", "Redirected to login/welcome", `Final URL: ${url}`, blocked ? "PASS" : "FAIL", blocked ? "" : "SECURITY: Unauthenticated access to worker area not blocked!");
  } catch (e) {
    logResult("TC-38", "Access Control", "Unauthenticated Worker Block", "Access /worker without login", "Redirected to login/welcome", e.message, "FAIL");
  }

  // TC-39: Unauthenticated access to contractor dashboard is blocked
  try {
    await safeGet(`${BASE_URL}/contractor`);
    const url = await driver.getCurrentUrl();
    const blocked = !url.includes("/contractor") || url.includes("login") || url.includes("welcome");
    logResult("TC-39", "Access Control", "Unauthenticated Contractor Block", "Access /contractor without login", "Redirected to login/welcome", `Final URL: ${url}`, blocked ? "PASS" : "FAIL", blocked ? "" : "SECURITY: Unauthenticated access to contractor area not blocked!");
  } catch (e) {
    logResult("TC-39", "Access Control", "Unauthenticated Contractor Block", "Access /contractor without login", "Redirected to login/welcome", e.message, "FAIL");
  }

  // TC-40: Forgot password page accessible
  try {
    await safeGet(`${BASE_URL}/forgot-password`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("forgot") || url.includes("login") || url.includes("welcome");
    logResult("TC-40", "Access Control", "Forgot Password Page", "Navigate to /forgot-password", "Forgot password page accessible", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-40", "Access Control", "Forgot Password Page", "Navigate to /forgot-password", "Forgot password page accessible", e.message, "FAIL");
  }

  // TC-41: Registration page accessible
  try {
    await safeGet(`${BASE_URL}/register?role=worker`);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("register") || url.includes("welcome") || url.includes("worker");
    logResult("TC-41", "Access Control", "Worker Registration Page", "Navigate to /register?role=worker", "Registration page accessible", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-41", "Access Control", "Worker Registration Page", "Navigate to /register?role=worker", "Registration page accessible", e.message, "FAIL");
  }
}

async function testWorkerJobFlow() {
  console.log("\n📋 Suite 7: Worker Job Browsing Flow");

  await performLogin("worker", WORKER_PHONE, WORKER_PASSWORD);
  const currentUrl = await driver.getCurrentUrl();
  const loggedIn = currentUrl.includes("/worker");

  // TC-42: Worker can browse available jobs
  if (!loggedIn) {
    logResult("TC-42", "Worker Job Flow", "Browse Jobs", "Navigate to job listings", "Jobs visible", "Login failed — skipped", "SKIP");
    logResult("TC-43", "Worker Job Flow", "Job Detail View", "Click on a job", "Job detail page loads", "Login failed — skipped", "SKIP");
    return;
  }

  try {
    await safeGet(`${BASE_URL}/worker/jobs`);
    await sleep(2000);
    const url = await driver.getCurrentUrl();
    const pass = url.includes("/worker");
    logResult("TC-42", "Worker Job Flow", "Browse Jobs", "Navigate to /worker/jobs", "Job listings page loads", `URL: ${url}`, pass ? "PASS" : "FAIL");
  } catch (e) {
    logResult("TC-42", "Worker Job Flow", "Browse Jobs", "Navigate to /worker/jobs", "Job listings page loads", e.message, "FAIL");
  }

  // TC-43: Job detail page
  try {
    await safeGet(`${BASE_URL}/worker/jobs`);
    await sleep(3000);
    const links = await driver.findElements(By.css("a[href*='/worker/jobs/']"));
    if (links.length > 0) {
      const href = await links[0].getAttribute("href");
      await driver.get(href);
      await sleep(3000);
      const url = await driver.getCurrentUrl();
      logResult("TC-43", "Worker Job Flow", "Job Detail View", "Click first job listing", "Job detail page loads", `URL: ${url}`, url.includes("/worker/jobs/") ? "PASS" : "FAIL");
    } else {
      logResult("TC-43", "Worker Job Flow", "Job Detail View", "Click first job listing", "Job detail page loads", "No job listings found on /worker/jobs", "SKIP");
    }
  } catch (e) {
    logResult("TC-43", "Worker Job Flow", "Job Detail View", "Click first job listing", "Job detail page loads", e.message, "FAIL");
  }
}

// ─── Excel Report Generator ───────────────────────────────────────────────────
async function generateExcelReport() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "JobNow Selenium E2E Suite";
  workbook.created = new Date();

  // ── Sheet 1: Full Test Results ──
  const sheet = workbook.addWorksheet("Test Results", {
    pageSetup: { paperSize: 9, orientation: "landscape" },
  });

  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  const skipCount = results.filter((r) => r.status === "SKIP").length;
  const total = results.length;

  // Title rows
  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = "JobNow Platform — Selenium E2E Test Report";
  sheet.getCell("A1").font = { size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 36;

  sheet.mergeCells("A2:J2");
  sheet.getCell("A2").value = `Target: ${BASE_URL}  |  Run Date: ${new Date().toLocaleString("en-IN")}  |  Total: ${total}  ✅ PASS: ${passCount}  ❌ FAIL: ${failCount}  ⚠️ SKIP: ${skipCount}`;
  sheet.getCell("A2").font = { size: 11, italic: true, color: { argb: "FF333333" } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } };
  sheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 24;

  // Header row
  const headers = ["Test ID", "Category", "Test Name", "Description", "Expected Result", "Actual Result", "Status", "Notes", "Time"];
  const headerRow = sheet.addRow(headers);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2C5282" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFAAAAAA" } },
      left: { style: "thin", color: { argb: "FFAAAAAA" } },
      bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
      right: { style: "thin", color: { argb: "FFAAAAAA" } },
    };
  });

  // Data rows
  for (const r of results) {
    const row = sheet.addRow([r.id, r.category, r.name, r.description, r.expected, r.actual, r.status, r.notes, r.timestamp]);
    row.height = 20;

    // Status colour
    const statusCell = row.getCell(7);
    if (r.status === "PASS") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4EDDA" } };
      statusCell.font = { bold: true, color: { argb: "FF155724" } };
    } else if (r.status === "FAIL") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
      statusCell.font = { bold: true, color: { argb: "FF721C24" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
      statusCell.font = { bold: true, color: { argb: "FF856404" } };
    }

    // Zebra striping
    const bgColor = results.indexOf(r) % 2 === 0 ? "FFF8FBFF" : "FFFFFFFF";
    row.eachCell((cell, col) => {
      if (col !== 7) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      }
      cell.alignment = { vertical: "middle", wrapText: col > 3 };
      cell.border = {
        top: { style: "hair", color: { argb: "FFDDDDDD" } },
        left: { style: "hair", color: { argb: "FFDDDDDD" } },
        bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        right: { style: "hair", color: { argb: "FFDDDDDD" } },
      };
    });
  }

  // Column widths
  sheet.columns = [
    { key: "id", width: 10 },
    { key: "cat", width: 22 },
    { key: "name", width: 35 },
    { key: "desc", width: 40 },
    { key: "exp", width: 38 },
    { key: "act", width: 42 },
    { key: "status", width: 10 },
    { key: "notes", width: 35 },
    { key: "ts", width: 14 },
  ];

  // Freeze header
  sheet.views = [{ state: "frozen", ySplit: 3, xSplit: 1, activeCell: "B4" }];

  // ── Sheet 2: Summary ──
  const sumSheet = workbook.addWorksheet("Summary");

  sumSheet.mergeCells("A1:D1");
  sumSheet.getCell("A1").value = "JobNow E2E Test Summary";
  sumSheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } };
  sumSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
  sumSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sumSheet.getRow(1).height = 40;

  const summaryData = [
    ["", ""],
    ["Application URL", BASE_URL],
    ["Test Run Date", new Date().toLocaleString("en-IN")],
    ["", ""],
    ["Total Test Cases", total],
    ["✅ PASSED", passCount],
    ["❌ FAILED", failCount],
    ["⚠️ SKIPPED", skipCount],
    ["", ""],
    ["Pass Rate", total > 0 ? `${Math.round((passCount / (total - skipCount)) * 100)}%` : "N/A"],
    ["", ""],
  ];

  // Category breakdown
  const categories = [...new Set(results.map((r) => r.category))];
  sumSheet.addRow(["Category Breakdown", ""]);
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPass = catResults.filter((r) => r.status === "PASS").length;
    const catFail = catResults.filter((r) => r.status === "FAIL").length;
    const catSkip = catResults.filter((r) => r.status === "SKIP").length;
    summaryData.push([cat, `${catPass} PASS / ${catFail} FAIL / ${catSkip} SKIP`]);
  }

  for (const [label, value] of summaryData) {
    const row = sumSheet.addRow([label, value]);
    if (label && label !== "") {
      row.getCell(1).font = { bold: true, size: 12 };
      row.getCell(2).font = { size: 12 };
      if (label === "✅ PASSED") row.getCell(2).font = { bold: true, color: { argb: "FF155724" }, size: 13 };
      if (label === "❌ FAILED") row.getCell(2).font = { bold: true, color: { argb: "FF721C24" }, size: 13 };
      if (label === "Pass Rate") {
        row.getCell(2).font = { bold: true, size: 14 };
        row.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: passCount >= failCount ? "FFD4EDDA" : "FFF8D7DA" } };
      }
    }
    row.height = 22;
  }

  sumSheet.columns = [{ key: "label", width: 28 }, { key: "value", width: 40 }];

  // ── Failed Tests Sheet ──
  const failedTests = results.filter((r) => r.status === "FAIL");
  if (failedTests.length > 0) {
    const failSheet = workbook.addWorksheet("Failed Tests");
    failSheet.mergeCells("A1:G1");
    failSheet.getCell("A1").value = `Failed Test Cases (${failedTests.length})`;
    failSheet.getCell("A1").font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    failSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B0000" } };
    failSheet.getCell("A1").alignment = { horizontal: "center" };
    failSheet.getRow(1).height = 30;

    const fh = failSheet.addRow(["Test ID", "Category", "Test Name", "Expected", "Actual", "Notes", "Time"]);
    fh.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCC0000" } };
      cell.alignment = { horizontal: "center" };
    });

    for (const r of failedTests) {
      const row = failSheet.addRow([r.id, r.category, r.name, r.expected, r.actual, r.notes, r.timestamp]);
      row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0F0" } };
    }

    failSheet.columns = [
      { width: 10 }, { width: 22 }, { width: 35 },
      { width: 38 }, { width: 42 }, { width: 35 }, { width: 14 },
    ];
  }

  // Save
  const outPath = path.join(__dirname, "..", "Vulnerability Test Results", "E2E_Test_Report.xlsx");
  try {
    await workbook.xlsx.writeFile(outPath);
    console.log(`\n📊 Excel report saved → ${outPath}`);
    return outPath;
  } catch (err) {
    console.error(`\n❌ Failed to save Excel report to ${outPath} because the file is locked or open in another program.`);
    const fallbackPath = path.join(__dirname, "..", "Vulnerability Test Results", `E2E_Test_Report_${Date.now()}.xlsx`);
    console.log(`💾 Attempting to save report to fallback location: ${fallbackPath}`);
    await workbook.xlsx.writeFile(fallbackPath);
    console.log(`📊 Excel report saved to fallback → ${fallbackPath}`);
    return fallbackPath;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 JobNow Selenium E2E Test Suite");
  console.log(`   Target: ${BASE_URL}`);
  console.log("─".repeat(60));

  const options = new chrome.Options();
  options.addArguments("--headless=new");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--window-size=1280,900");
  options.addArguments("--disable-gpu");
  options.addArguments("--disable-extensions");
  options.addArguments("--disable-notifications");

  try {
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 30000, script: 10000 });

    await testHomepage();
    await testWorkerAuth();
    await testWorkerDashboard();
    await testContractorAuth();
    await testContractorDashboard();
    await testProtectedRoutes();
    await testWorkerJobFlow();

  } finally {
    if (driver) await driver.quit();
  }

  // Summary
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  console.log("\n" + "═".repeat(60));
  console.log(`📊 Results: ${results.length} tests  |  ✅ ${pass} PASS  |  ❌ ${fail} FAIL  |  ⚠️ ${skip} SKIP`);
  console.log(`   Pass rate: ${Math.round((pass / (results.length - skip)) * 100)}%`);
  console.log("═".repeat(60));

  await generateExcelReport();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  if (driver) driver.quit().catch(() => {});
  process.exit(1);
});
