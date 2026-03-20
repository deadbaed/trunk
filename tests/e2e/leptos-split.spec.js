// @ts-check
const { test, expect } = require("@playwright/test");
const {
  expectNoRuntimeErrors,
  isAuxiliaryWasm,
  trackRuntimeErrors,
} = require("./runtime");

test("Leptos lazy function fetches a wasm-split chunk", async ({ page }) => {
  const runtime = trackRuntimeErrors(page);

  await page.goto("/");
  await expect(page.locator("#page-title")).toHaveText("Home");
  await expect(page.locator("#lazy-message")).toHaveText("Not loaded yet.");

  await page.locator("#local-update").click();
  await expect(page.locator("#lazy-message")).toHaveText(
    "Updated from the main bundle.",
  );

  const splitChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#lazy-update").click();

  expect((await splitChunk).ok()).toBeTruthy();
  await expect(page.locator("#lazy-message")).toHaveText(
    "Hello from a Leptos lazy function.",
  );

  expectNoRuntimeErrors(runtime);
});

test("Leptos lazy route navigation and deep links fetch split chunks", async ({ page, browser }) => {
  const runtime = trackRuntimeErrors(page);

  await page.goto("/");
  await expect(page.locator("#page-title")).toHaveText("Home");

  const routeChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#nav-about").click();

  expect((await routeChunk).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("#page-title")).toHaveText("About");
  await expect(page.locator("#about-copy")).toHaveText(
    "Loaded from a Leptos lazy route.",
  );

  expectNoRuntimeErrors(runtime);

  const deepContext = await browser.newContext();
  const deepPage = await deepContext.newPage();
  const deepRuntime = trackRuntimeErrors(deepPage);
  const deepRouteChunk = deepPage.waitForResponse((response) => isAuxiliaryWasm(response));

  await deepPage.goto("http://127.0.0.1:8092/about");

  expect((await deepRouteChunk).ok()).toBeTruthy();
  await expect(deepPage.locator("#page-title")).toHaveText("About");
  await expect(deepPage.locator("#about-copy")).toHaveText(
    "Loaded from a Leptos lazy route.",
  );

  expectNoRuntimeErrors(deepRuntime);
  await deepContext.close();
});

test("Leptos nested lazy route can trigger a nested lazy function chain", async ({ page }) => {
  const runtime = trackRuntimeErrors(page);

  await page.goto("/");
  const routeChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#nav-nested").click();

  expect((await routeChunk).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/nested$/);
  await expect(page.locator("#page-title")).toHaveText("Nested");
  await expect(page.locator("#nested-message")).toHaveText("Not loaded yet.");

  const nestedChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#nested-load").click();

  expect((await nestedChunk).ok()).toBeTruthy();
  await expect(page.locator("#nested-message")).toHaveText(
    "outer lazy function result -> inner lazy function result",
  );

  expectNoRuntimeErrors(runtime);
});
