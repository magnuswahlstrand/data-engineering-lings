export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export interface QueryResult {
  columns: string[];
  rows: Row[];
}
export type Schema = Record<string, { name: string; type: string }[]>;
export interface Fixture {
  file: string;
  table?: string;
  format: "csv" | "json";
  columns: string[];
}
export interface ExerciseMeta {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  topics: string[];
  stage: "bronze" | "silver" | "gold";
  minutes: number;
  intro: string;
  objectives: string[];
  hints: string[];
  solutionExplanation?: string;
  target: string;
  fixtures: Fixture[];
  setup?: string;
}
export interface Exercise extends ExerciseMeta {
  starter: string;
  solution: string;
  inputs: Record<string, string>;
  tests: Check[];
}
export type Check = { label: string; why: string } & (
  | { kind: "columns"; table: string; expected: string[] }
  | { kind: "rowCount"; table: string; expected: number }
  | { kind: "unique"; table: string; columns: string[] }
  | { kind: "notNull"; table: string; columns: string[] }
  | { kind: "value"; query: string; expected: Cell }
  | { kind: "rows"; query: string; expected: Row[]; keys?: string[] }
);
export interface TestResult {
  label: string;
  why: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
  detail?: string;
}
