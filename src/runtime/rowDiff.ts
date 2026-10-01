import type { Row } from "./types";
export interface RowDifference {
  status: "match" | "changed" | "missing" | "unexpected";
  expected?: Row;
  actual?: Row;
}
export const sameCell = (a: Row, b: Row, column: string) =>
  Object.hasOwn(a, column) === Object.hasOwn(b, column) &&
  a[column] === b[column];
const sameRow = (a: Row, b: Row) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.keys(a).every((c) => sameCell(a, b, c));
/** Match exact rows first, then pair remaining rows only by author-declared keys.
 * This preserves duplicates and never implies that arbitrary row ordering is identity. */
export function diffRows(
  expected: Row[],
  actual: Row[],
  keys: string[] = [],
): RowDifference[] {
  const unused = new Set(actual.map((_, i) => i));
  const exact = expected.map((row) => {
    const index = [...unused].find((i) => sameRow(row, actual[i]));
    if (index !== undefined) unused.delete(index);
    return index;
  });
  const differences = expected.map((row, index): RowDifference => {
    const match = exact[index];
    if (match !== undefined)
      return { status: "match", expected: row, actual: actual[match] };
    const paired = keys.length
      ? [...unused].find((i) =>
          keys.every(
            (k) =>
              Object.hasOwn(row, k) &&
              Object.hasOwn(actual[i], k) &&
              sameCell(row, actual[i], k),
          ),
        )
      : undefined;
    if (paired !== undefined) {
      unused.delete(paired);
      return { status: "changed", expected: row, actual: actual[paired] };
    }
    return { status: "missing", expected: row };
  });
  return [
    ...differences,
    ...[...unused].map((i) => ({
      status: "unexpected" as const,
      actual: actual[i],
    })),
  ];
}
