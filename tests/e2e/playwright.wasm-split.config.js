// @ts-check
const { defineConfig, devices } = require("@playwright/test");
const path = require("path");

const repoRoot = path.resolve(__dirname, "../..");
const defaultTrunkCommand = `cargo run --manifest-path "${path.join(repoRoot, "Cargo.toml")}" --`;
const trunkCommand = process.env.TRUNK_CMD || defaultTrunkCommand;

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: ["split-wasm.spec.js"],
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "list" : "html",
  timeout: 10 * 60 * 1000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8091",
    trace: "retain-on-failure",
  },
  webServer: {
    cwd: path.join(repoRoot, "examples", "wasm-split"),
    command: `${trunkCommand} serve --address 127.0.0.1 --port 8091 --no-autoreload --disable-address-lookup`,
    port: 8091,
    timeout: 10 * 60 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
  },
});
