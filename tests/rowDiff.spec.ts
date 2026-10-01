import { test, expect } from "@playwright/test";
import { diffRows, sameCell } from "../src/runtime/rowDiff";
test("row diff ignores ordering while retaining duplicate multiplicity", () => {
  expect(
    diffRows([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 1 }]).map(
      (r) => r.status,
    ),
  ).toEqual(["match", "match"]);
  expect(
    diffRows([{ id: 1 }, { id: 1 }], [{ id: 1 }]).map((r) => r.status),
  ).toEqual(["match", "missing"]);
  expect(
    diffRows([{ id: 1 }], [{ id: 1 }, { id: 1 }]).map((r) => r.status),
  ).toEqual(["match", "unexpected"]);
});
test("exact matches take priority over key pairing, and unkeyed rows are never guessed", () => {
  const before = [
    { id: 1, email: "old" },
    { id: 1, email: "same" },
  ];
  const after = [
    { id: 1, email: "same" },
    { id: 1, email: "new" },
  ];
  const diff = diffRows(before, after, ["id"]);
  expect(diff.map((r) => r.status)).toEqual(["changed", "match"]);
  expect(diff[0].actual?.email).toBe("new");
  expect(diffRows([before[0]], [after[1]]).map((r) => r.status)).toEqual([
    "missing",
    "unexpected",
  ]);
});
test("composite keys, empty results, NULL, absent fields and types remain distinct", () => {
  expect(diffRows([], [])).toEqual([]);
  expect(
    diffRows(
      [{ id: 1, version: 1 }],
      [{ id: 1, version: 2 }],
      ["id", "version"],
    ).map((r) => r.status),
  ).toEqual(["missing", "unexpected"]);
  expect(sameCell({ value: null }, {}, "value")).toBe(false);
  expect(sameCell({ value: 1 }, { value: "1" }, "value")).toBe(false);
});
