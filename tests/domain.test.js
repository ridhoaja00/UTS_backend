import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  validDate,
  hashPassword,
  verifyPassword,
  detectImage,
  digest,
} from "../server/domain.js";
test("calendar months clamp the day at month end", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-12-31", 2), "2027-02-28");
});
test("reject impossible or malformed dates", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-2-03"), false);
  assert.equal(validDate("invalid"), false);
  assert.equal(validDate("2028-02-29"), true);
});
test("password hashes are salted and verify correctly", async () => {
  const a = await hashPassword("long-password-123");
  const b = await hashPassword("long-password-123");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("long-password-123", a), true);
  assert.equal(await verifyPassword("wrong-password", a), false);
});
test("proof signature rejects HTML, SVG and arbitrary data", () => {
  assert.equal(detectImage(Buffer.from('<svg onload="alert(1)">')), null);
  assert.equal(detectImage(Buffer.from("<html>")), null);
  assert.equal(detectImage(Buffer.from([255, 216, 255, 1])).mime, "image/jpeg");
  assert.equal(
    detectImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])).mime,
    "image/png",
  );
});
test("session tokens are represented by a digest", () => {
  assert.equal(digest("abc").length, 64);
  assert.notEqual(digest("abc"), digest("abcd"));
});
