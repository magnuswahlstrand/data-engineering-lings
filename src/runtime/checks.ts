import type { Cell, Check, Row, QueryResult, TestResult } from "./types";
export const ident = (s: string) => `"${s.replaceAll('"', '""')}"`;
export const literal = (s: string) => `'${s.replaceAll("'", "''")}'`;
/** Exact column names, independent of their order or the number of rows. */
export const expectColumns = (
  table: string,
  expected: string[],
  why = "Keep the required output names. Give transformed expressions explicit aliases, for example TRY_CAST(updated_at AS TIMESTAMP) AS updated_at.",
): Check => ({
  kind: "columns",
  table,
  expected,
  label: `${table} has the expected columns`,
  why,
});
export const expectRowCount = (
  table: string,
  expected: number,
  why: string,
): Check => ({
  kind: "rowCount",
  table,
  expected,
  label: `${table} has ${expected} rows`,
  why,
});
export const expectUnique = (
  table: string,
  columns: string[],
  why: string,
): Check => ({
  kind: "unique",
  table,
  columns,
  label: `${columns.join(" + ")} is unique`,
  why,
});
export const expectNotNull = (
  table: string,
  columns: string[],
  why: string,
): Check => ({
  kind: "notNull",
  table,
  columns,
  label: `${columns.join(", ")} are never null`,
  why,
});
export const expectValue = (
  query: string,
  expected: Cell,
  label: string,
  why: string,
): Check => ({ kind: "value", query, expected, label, why });
export const expectRows = (
  query: string,
  expected: Row[],
  label: string,
  why: string,
  keys?: string[],
): Check => ({ kind: "rows", query, expected, label, why, keys });
// Sort keys and rows, but retain duplicate rows: equality is a multiset comparison.
const canonical = (rows: Row[]) =>
  rows
    .map((row) =>
      JSON.stringify(
        Object.keys(row)
          .sort()
          .map((k) => [k, row[k]]),
      ),
    )
    .sort();
export async function runChecks(
  checks: Check[],
  query: (sql: string) => Promise<QueryResult>,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const check of checks) {
    try {
      let actual: unknown;
      let expected: unknown;
      let passed: boolean;
      let detail: string | undefined;
      if (check.kind === "columns") {
        const columns = (
          await query(`SELECT * FROM ${ident(check.table)} LIMIT 0`)
        ).columns;
        expected = check.expected;
        actual = columns;
        const missing = check.expected.filter(
          (name) => !columns.includes(name),
        );
        const unexpected = columns.filter(
          (name) => !check.expected.includes(name),
        );
        passed =
          !missing.length &&
          !unexpected.length &&
          columns.length === check.expected.length;
        if (!passed)
          detail = [
            missing.length ? `Missing columns: ${missing.join(", ")}.` : "",
            unexpected.length
              ? `Unexpected columns: ${unexpected.join(", ")}.`
              : "",
          ]
            .filter(Boolean)
            .join(" ");
      } else if (check.kind === "rows") {
        actual = (await query(check.query)).rows;
        expected = check.expected;
        passed =
          JSON.stringify(canonical(actual as Row[])) ===
          JSON.stringify(canonical(check.expected));
      } else if (check.kind === "value") {
        const result = await query(check.query);
        expected = check.expected;
        actual =
          result.rows.length === 1 && result.columns.length === 1
            ? result.rows[0][result.columns[0]]
            : result.rows;
        passed = actual === expected;
      } else {
        const table = ident(check.table);
        const sql =
          check.kind === "rowCount"
            ? `SELECT COUNT(*) AS n FROM ${table}`
            : check.kind === "notNull"
              ? `SELECT COUNT(*) AS n FROM ${table} WHERE ${check.columns.map((c) => `${ident(c)} IS NULL`).join(" OR ")}`
              : `SELECT COUNT(*) AS n FROM (SELECT ${check.columns.map(ident).join(",")} FROM ${table} GROUP BY ALL HAVING COUNT(*) > 1)`;
        actual = Number((await query(sql)).rows[0].n);
        expected = check.kind === "rowCount" ? check.expected : 0;
        passed = actual === expected;
      }
      results.push({
        label: check.label,
        why: check.why,
        passed,
        actual,
        expected,
        detail,
      });
    } catch (error) {
      results.push({
        label: check.label,
        why: check.why,
        passed: false,
        error: String(error),
      });
    }
  }
  return results;
}
