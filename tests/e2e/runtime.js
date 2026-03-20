// @ts-check
const { expect } = require("@playwright/test");

function trackRuntimeErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

function expectNoRuntimeErrors({ consoleErrors, pageErrors }) {
  expect(pageErrors).toEqual([]);

  for (const error of consoleErrors) {
    expect(error).not.toContain("text/html is not a valid JavaScript MIME type");
    expect(error).not.toContain("Failed to fetch dynamically imported module");
    expect(error).not.toContain("__wasm_split_placeholder__");
  }
}

function isAuxiliaryWasm(response) {
  return response.url().endsWith(".wasm") && !response.url().includes("_bg.wasm");
}

async function primeTrunkSplitMetadata(page) {
  await page.addInitScript(() => {
    window.__trunkSplitMetadataPromise = new Promise((resolve) => {
      window.addEventListener(
        "TrunkApplicationStarted",
        (event) => {
          window.__trunkSplitMetadata = event.detail.wasmSplit ?? null;
          resolve(window.__trunkSplitMetadata);
        },
        { once: true },
      );
    });
  });
}

async function readTrunkSplitMetadata(page) {
  return page.evaluate(() => window.__trunkSplitMetadataPromise);
}

module.exports = {
  expectNoRuntimeErrors,
  isAuxiliaryWasm,
  primeTrunkSplitMetadata,
  readTrunkSplitMetadata,
  trackRuntimeErrors,
};
