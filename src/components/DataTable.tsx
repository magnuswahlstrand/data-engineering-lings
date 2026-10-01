import type { QueryResult } from "../runtime/types";
export function DataTable({ data }: { data: QueryResult }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th className="row-number">#</th>
            {data.columns.map((c, i) => (
              <th key={`${i}-${c}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              <td className="row-number">{i + 1}</td>
              {data.columns.map((c, j) => (
                <td key={`${j}-${c}`}>
                  {row[c] === null ? (
                    <span className="null-value">NULL</span>
                  ) : (
                    String(row[c])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!data.rows.length && (
        <p className="empty-rows">This query returned no rows.</p>
      )}
    </div>
  );
}
