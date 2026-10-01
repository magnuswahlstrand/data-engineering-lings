import type { Exercise, ExerciseMeta, Check } from "./runtime/types";
const metadata = import.meta.glob<ExerciseMeta>(
  "../exercises/*/exercise.json",
  { eager: true, import: "default" },
);
const starters = import.meta.glob<string>("../exercises/*/starter.sql", {
  eager: true,
  query: "?raw",
  import: "default",
});
const inputs = import.meta.glob<string>("../exercises/*/input/*", {
  eager: true,
  query: "?raw",
  import: "default",
});
const tests = import.meta.glob<Check[]>("../exercises/*/tests.ts", {
  eager: true,
  import: "default",
});
export const exercises: Exercise[] = Object.entries(metadata)
  .map(([path, meta]) => {
    const dir = path.replace("/exercise.json", "");
    const starter = starters[`${dir}/starter.sql`];
    const checks = tests[`${dir}/tests.ts`];
    if (!starter || !checks?.length)
      throw new Error(`Missing starter or tests for ${meta.id}`);
    const files = Object.fromEntries(
      meta.fixtures.map((f) => {
        const source = inputs[`${dir}/input/${f.file}`];
        if (source === undefined)
          throw new Error(`Missing fixture ${f.file} in ${meta.id}`);
        return [f.file, source];
      }),
    );
    return { ...meta, starter, tests: checks, inputs: files };
  })
  .sort((a, b) => a.id.localeCompare(b.id));
