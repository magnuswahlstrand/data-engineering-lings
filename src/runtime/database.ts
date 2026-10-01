import * as duckdb from "@duckdb/duckdb-wasm";
import wasmMvp from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import wasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import workerMvp from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import workerEh from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import type { Exercise, QueryResult, Schema, Cell } from "./types";
import { ident, literal, runChecks } from "./checks";
let instance: Promise<Runtime> | undefined;
export function getRuntime() {
  return (instance ??= (async () => {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: wasmMvp, mainWorker: workerMvp },
      eh: { mainModule: wasmEh, mainWorker: workerEh },
    });
    const worker = new Worker(bundle.mainWorker!);
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule);
    return new Runtime(db);
  })().catch((error) => {
    instance = undefined;
    throw error;
  }));
}
function cell(value: unknown): Cell {
  if (value == null) return null;
  if (typeof value === "bigint")
    return Number.isSafeInteger(Number(value)) ? Number(value) : String(value);
  if (value instanceof Date)
    return value
      .toISOString()
      .replace("T", " ")
      .replace(/\.000Z$/, "");
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  return String(value);
}
export class Runtime {
  private conn?: duckdb.AsyncDuckDBConnection;
  constructor(private db: duckdb.AsyncDuckDB) {}
  async query(sql: string): Promise<QueryResult> {
    if (!this.conn) throw new Error("The exercise database is not ready.");
    const result = await this.conn.query(sql);
    const fields = result.schema.fields;
    return {
      columns: fields.map((f) => f.name),
      rows: result.toArray().map((row) =>
        Object.fromEntries(
          fields.map((f) => {
            const value = row[f.name];
            if (
              value != null &&
              "scale" in f.type &&
              typeof f.type.scale === "number"
            ) {
              const raw = String(value);
              const negative = raw.startsWith("-");
              const digits = raw
                .replace(/^-/, "")
                .padStart(f.type.scale + 1, "0");
              const scaled = f.type.scale
                ? `${digits.slice(0, -f.type.scale)}.${digits.slice(-f.type.scale)}`
                : digits;
              return [f.name, `${negative ? "-" : ""}${scaled}`];
            }
            // Arrow's timestamp scalar is milliseconds since epoch, even for microsecond fields.
            return [
              f.name,
              value != null && f.type.toString().startsWith("Timestamp")
                ? cell(new Date(Number(value)))
                : cell(value),
            ];
          }),
        ),
      ),
    };
  }
  async load(exercise: Exercise) {
    await this.conn?.close();
    this.conn = undefined;
    await this.db.open({ path: ":memory:" });
    await this.db.dropFiles();
    this.conn = await this.db.connect();
    for (const fixture of exercise.fixtures) {
      await this.db.registerFileText(
        fixture.file,
        exercise.inputs[fixture.file],
      );
      if (!fixture.table) continue;
      if (fixture.format === "csv") {
        await this.query(
          `CREATE TABLE ${ident(fixture.table)} AS SELECT * FROM read_csv(${literal(fixture.file)}, header=true, all_varchar=true)`,
        );
      } else {
        const columns = fixture.columns
          .map((c) => `${literal(c)}: 'VARCHAR'`)
          .join(", ");
        await this.query(
          `CREATE TABLE ${ident(fixture.table)} AS SELECT * FROM read_json(${literal(fixture.file)}, columns={${columns}}, format='array')`,
        );
      }
    }
    if (exercise.setup) await this.query(exercise.setup);
    return this.schema();
  }
  async schema(): Promise<Schema> {
    const result = await this.query(
      `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'main' ORDER BY table_name, ordinal_position`,
    );
    const schema: Schema = {};
    for (const r of result.rows)
      (schema[String(r.table_name)] ??= []).push({
        name: String(r.column_name),
        type: String(r.data_type),
      });
    return schema;
  }
  async run(sql: string, exercise: Exercise) {
    const start = performance.now();
    const result = await this.query(sql);
    const tests = await runChecks(exercise.tests, (s) => this.query(s));
    return {
      result,
      tests,
      schema: await this.schema(),
      ms: Math.round(performance.now() - start),
    };
  }
  async inspect(table: string) {
    return this.query(`SELECT * FROM ${ident(table)} LIMIT 100`);
  }
}
