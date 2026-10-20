import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile("index.html", "utf8");
const backend = await readFile("google-apps-script.gs", "utf8");
const ui = await readFile("src/ui.js", "utf8");
const sync = await readFile("src/sync.js", "utf8");

test("interface contains day-first controls and no legacy notes", () => {
  assert.match(html, /data-day-tabs/);
  assert.match(html, /Choose a workout…/);
  assert.doesNotMatch(
    html.toLowerCase(),
    /session note|weekly notes|history view/,
  );
});

test("backend retains the unified state sheet", () => {
  assert.match(backend, /KinetoState/);
  assert.match(backend, /sanitizeState_/);
});

test("every week defaults to the current local weekday", () => {
  assert.match(ui, /index \+ 1,\s*new Date\(\)\.getDay\(\)/);
});

test("cloud saves survive refresh and require read-back confirmation", () => {
  assert.match(html, /app\.js\?v=20261019-week-1/);
  assert.match(sync, /keepalive:\s*true/);
  assert.match(sync, /verifyTimestamp/);
  assert.match(sync, /Verifying cloud save/);
  assert.doesNotMatch(sync, /Cloud save sent/);
});
