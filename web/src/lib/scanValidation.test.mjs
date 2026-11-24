import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScan } from "./scanValidation.ts";
import { decodeDetections } from "./recognition.ts";

test("replaces scanned tiles only when physical and red tile counts allow it", () => {
  const remaining = { "5m": 2, red5m: 1 };
  assert.deepEqual(validateScan(["0m", "5m"], remaining, 14, false), {
    tiles: [{ tile: "5m", isRed: true }, { tile: "5m", isRed: false }],
    error: null,
  });
  assert.equal(validateScan(["0m", "0m"], remaining, 14, false).error, "unavailable");
  assert.equal(validateScan(["5m", "5m", "5m"], remaining, 14, false).error, "unavailable");
  assert.equal(validateScan([""], remaining, 14, false).error, "unknown");
});

test("validates meld shape and three-player tile restrictions", () => {
  const remaining = { "1p": 4, "2p": 4, "3p": 4, "2m": 4, "5p": 4, red5p: 1 };
  assert.equal(validateScan(["3p", "1p", "2p"], remaining, 3, false, "chi").error, null);
  assert.equal(validateScan(["1p", "2p", "2p"], remaining, 3, false, "chi").error, "meld");
  assert.equal(validateScan(["5p", "0p", "5p", "5p"], remaining, 4, false, "kan").error, null);
  assert.equal(validateScan(["1p", "2p", "3p"], remaining, 3, false, "pon").error, "meld");
  assert.equal(validateScan(["2m"], remaining, 14, true).error, "sanma");
  assert.equal(validateScan(["1p", "2p", "3p"], remaining, 2, false).error, "tooMany");
});

test("decodes normalized boxes, suppresses overlap, and retains unknown tiles", () => {
  const anchors = 8400;
  const output = new Float32Array(42 * anchors);
  function set(i, cls, score, x) {
    output[i] = x;
    output[anchors + i] = 0.5;
    output[2 * anchors + i] = 0.1;
    output[3 * anchors + i] = 0.1;
    output[(4 + cls) * anchors + i] = score;
  }
  set(0, 0, 0.9, 0.2);
  set(1, 0, 0.8, 0.201);
  set(2, 34, 0.7, 0.8);
  const result = decodeDetections(output, 640, 640);
  assert.deepEqual(result.map((d) => d.tile), ["1m", ""]);
  assert.ok(Math.abs(result[0].box[0] - 0.15) < 0.001);
});
