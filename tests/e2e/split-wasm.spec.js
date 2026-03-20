// @ts-check
const { test, expect } = require("@playwright/test");
const {
  expectNoRuntimeErrors,
  isAuxiliaryWasm,
  primeTrunkSplitMetadata,
  readTrunkSplitMetadata,
  trackRuntimeErrors,
} = require("./runtime");

test("lazy action fetches a wasm-split chunk", async ({ page }) => {
  const runtime = trackRuntimeErrors(page);
  await primeTrunkSplitMetadata(page);

  await page.goto("/");
  await expect(page.locator("#route-title")).toHaveText("Home");
  await expect(page.locator("#count-value")).toHaveText("Count: 1");

  const wasmSplit = await readTrunkSplitMetadata(page);
  expect(wasmSplit).toBeTruthy();
  expect(wasmSplit.loader).toContain("__wasm_split");
  expect(wasmSplit.manifest).toContain("__wasm_split_manifest");

  const manifest = await page.evaluate(async () => {
    const response = await fetch(window.__trunkSplitMetadata.manifest);
    return response.json();
  });
  expect(manifest.loader).toContain("__wasm_split");
  const manifestFiles = Object.values(manifest.prefetch_map).flat();
  expect(manifestFiles.length).toBeGreaterThan(0);
  expect(manifestFiles.every((file) => file.endsWith(".wasm"))).toBeTruthy();

  await page.locator("#local-add").click();
  await expect(page.locator("#count-value")).toHaveText("Count: 2");

  const splitChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#lazy-add").click();

  expect((await splitChunk).ok()).toBeTruthy();
  await expect(page.locator("#count-value")).toHaveText("Count: 9");
  await expect(page.locator("#status")).toHaveText("Lazy split chunk loaded.");

  expectNoRuntimeErrors(runtime);
});

test("route navigation and deep links fetch split route chunks", async ({ page, browser }) => {
  const runtime = trackRuntimeErrors(page);

  await page.goto("/");
  await expect(page.locator("#route-title")).toHaveText("Home");

  const routeChunk = page.waitForResponse((response) => isAuxiliaryWasm(response));
  await page.locator("#nav-details").click();

  expect((await routeChunk).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/details$/);
  await expect(page.locator("#route-title")).toHaveText("Details");
  await expect(page.locator("#route-body")).toContainText(
    "Details route loaded from a split WASM chunk.",
  );

  expectNoRuntimeErrors(runtime);

  const deepContext = await browser.newContext();
  const deepPage = await deepContext.newPage();
  const deepRuntime = trackRuntimeErrors(deepPage);
  const deepRouteChunk = deepPage.waitForResponse((response) => isAuxiliaryWasm(response));

  await deepPage.goto("http://127.0.0.1:8091/details");

  expect((await deepRouteChunk).ok()).toBeTruthy();
  await expect(deepPage.locator("#route-title")).toHaveText("Details");
  await expect(deepPage.locator("#route-body")).toContainText(
    "Details route loaded from a split WASM chunk.",
  );

  expectNoRuntimeErrors(deepRuntime);
  await deepContext.close();
});
