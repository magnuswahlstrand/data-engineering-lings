import type { Cell, Check, Row, TestResult } from "../runtime/types";
import { diffRows, sameCell } from "../runtime/rowDiff";
function Value({ value, present = true }: { value?: Cell; present?: boolean }) {
  if (!present) return <span className="diff-absent">No column</span>;
  if (value === null) return <span className="null-value">NULL</span>;
  // Quoted text makes whitespace and string-vs-number differences visible.
  return (
    <>{typeof value === "string" ? JSON.stringify(value) : String(value)}</>
  );
}
const labels = {
  match: "Match",
  changed: "Changed",
  missing: "Missing row",
  unexpected: "Unexpected row",
};
export function RowComparison({
  expected,
  actual,
  keys,
}: {
  expected: Row[];
  actual: Row[];
  keys?: string[];
}) {
  const columns = [...new Set([...expected, ...actual].flatMap(Object.keys))];
  const rows = diffRows(expected, actual, keys);
  return (
    <div className="row-comparison">
      <p className="diff-legend">
        <span>
          <del>− Expected</del>
        </span>
        <span>
          <ins>+ Actual</ins>
        </span>
        <span>
          {expected.length} expected · {actual.length} actual rows
        </span>
      </p>
      <div className="table-scroll">
        <table aria-label="Row differences">
          <thead>
            <tr>
              <th scope="col">Status</th>
              {columns.map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`diff-${row.status}`}>
                <th scope="row">
                  <span className="diff-status">{labels[row.status]}</span>
                </th>
                {columns.map((c) => {
                  const changed =
                    row.expected &&
                    row.actual &&
                    !sameCell(row.expected, row.actual, c);
                  return (
                    <td
                      key={c}
                      className={changed ? "diff-cell-changed" : undefined}
                    >
                      {changed ? (
                        <div className="cell-diff">
                          <del aria-label="Expected value">
                            <span aria-hidden="true">− </span>
                            <Value
                              value={row.expected![c]}
                              present={Object.hasOwn(row.expected!, c)}
                            />
                          </del>
                          <ins aria-label="Actual value">
                            <span aria-hidden="true">+ </span>
                            <Value
                              value={row.actual![c]}
                              present={Object.hasOwn(row.actual!, c)}
                            />
                          </ins>
                        </div>
                      ) : (
                        <Value
                          value={(row.expected ?? row.actual)![c]}
                          present={Object.hasOwn(
                            (row.expected ?? row.actual)!,
                            c,
                          )}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="empty-rows">Both results contain no rows.</p>
      )}
    </div>
  );
}
export function CheckComparison({
  check,
  result,
}: {
  check: Check;
  result: TestResult;
}) {
  if (check.kind === "rows")
    return (
      <RowComparison
        expected={check.expected}
        actual={result.actual as Row[]}
        keys={check.keys}
      />
    );
  const suffix =
    check.kind === "unique"
      ? " DUPLICATE GROUPS"
      : check.kind === "notNull"
        ? " NULL ROWS"
        : "";
  return (
    <div className="comparison" aria-label="Expected and actual values">
      <div>
        <span>EXPECTED{suffix}</span>
        <pre>{JSON.stringify(result.expected, null, 2)}</pre>
      </div>
      <div>
        <span>ACTUAL{suffix}</span>
        <pre>{JSON.stringify(result.actual, null, 2)}</pre>
      </div>
    </div>
  );
}
