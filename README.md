# DE-lings

Small, interactive data engineering exercises. React + TypeScript, CodeMirror 6, and DuckDB-Wasm. SQL runs in a browser worker. There are no accounts or backend services. Drafts and progress are saved in browser localStorage.

## Run locally

Requires Node.js 20.19+ (or a current supported Node.js release).

```sh
npm ci
npm run dev
```

Open the URL Vite prints. SQL runs with **⌘/Ctrl + Enter** or **Run & check**. Use **Ctrl + Space** for completion. Inspect source files in **Raw data**, and created tables and their types in **Tables**.

Drafts (including an intentionally empty editor), completed exercises, and your last selected exercise are saved in this browser across refreshes. Switching exercises rebuilds the database from fixtures; run your saved SQL to recreate its output. Completion is earned by passing every check and stays recorded while you experiment. Reset clears only that exercise’s draft, attempts, and completion, restoring its starter SQL. Clearing browser/site data removes saved progress; no data syncs between browsers. If storage is blocked or full, the app keeps working in memory and shows a notice. Invalid saved data is ignored.

After the last hint, **Reveal solution** shows reference SQL and an explanation. **Copy to editor** replaces your draft without executing it or completing the exercise. Run the checks to complete it.

## Included exercises

1. CSV → Bronze: preserve raw text, whitespace, and duplicates.
2. Bronze → Silver: type conversion, normalization, blank values, malformed timestamps.
3. Bronze → Silver: retain the latest record with a window function.
4. Silver → Gold: aggregate JSON-sourced orders into customer revenue.
5. Silver SCD Type 2: build half-open history intervals and one current version per customer.

## Add an exercise

Add a folder; no React or runtime changes are needed:

```text
exercises/006-your-exercise/
  exercise.json
  input/your-fixture.csv
  starter.sql
  solution.sql
  tests.ts
```

`src/exercises.ts` discovers metadata, starters, fixtures, and test declarations with Vite globs. It also imports reference solutions, which stay hidden in the UI until explicitly revealed after the last hint. Add `solutionExplanation` to metadata to explain the approach. Solutions are bundled into the static site; hiding them in the UI is a learning aid, not access control.

An exercise is independent of every other exercise. Declare all source fixtures and prerequisite tables it needs. Example metadata:

```json
{
  "id": "006-your-exercise",
  "title": "Clean a product catalog",
  "description": "A short subtitle.",
  "intro": "The task and its context.",
  "difficulty": 1,
  "minutes": 10,
  "stage": "silver",
  "topics": ["casting", "null handling"],
  "objectives": ["Create silver_products with typed IDs."],
  "hints": ["Try CAST(product_id AS BIGINT)."],
  "target": "silver_products",
  "fixtures": [
    {
      "file": "products.csv",
      "format": "csv",
      "table": "bronze_products",
      "columns": ["product_id", "name"]
    }
  ]
}
```

Fixtures are registered under their declared filenames. A `table` entry automatically creates a raw-text Bronze table. Omit `table` when loading the fixture is the learner's task. CSV loads with `header=true, all_varchar=true`; JSON fixtures are arrays of objects with explicit VARCHAR column declarations. An optional `setup` SQL string creates prerequisites, such as a typed Silver table for a Gold exercise.

`tests.ts` exports data, not callbacks. Helpers construct declarative checks:

```ts
import {
  expectColumns,
  expectRowCount,
  expectUnique,
  expectNotNull,
  expectValue,
  expectRows,
} from "../../src/runtime/checks";

export default [
  expectColumns(
    "silver_products",
    ["product_id", "name"],
    "Keep the expected names; use AS to alias expressions.",
  ),
  expectRowCount("silver_products", 2, "Keep both source products."),
  expectUnique(
    "silver_products",
    ["product_id"],
    "Each product needs one current record.",
  ),
  expectNotNull(
    "silver_products",
    ["product_id"],
    "A product must have a usable key.",
  ),
  expectValue(
    "SELECT count(*) FROM silver_products",
    2,
    "Two products remain",
    "Do not drop valid records.",
  ),
  expectRows(
    "SELECT product_id, name FROM silver_products",
    [
      { product_id: 1, name: "Notebook" },
      { product_id: 2, name: "Pencil" },
    ],
    "Cleaned records match",
    "Trim names and convert IDs to integers.",
  ),
];
```

Checks query DuckDB rather than inspecting SQL text. `expectColumns` checks the exact output column names (ignoring order), even for empty tables, and reports missing and unexpected names with alias guidance. Result-set checks ignore row order and object-key order but preserve duplicate multiplicity. Feedback is a row diff table: exact matches first, then changed cells aligned by optional author-declared keys (the sixth argument to `expectRows`, e.g. `["customer_id"]`). Unpaired records are labeled missing or unexpected; without keys, only exact matches are paired. These keys affect presentation, not pass/fail semantics. Only `expectRows` renders a table diff. Column and scalar checks retain compact expected/actual values, with missing-column explanations where applicable. Scalar checks require exactly one row and one column. Each failed check includes a reason and expected/actual values or the underlying query error. SQL invariants such as SCD2 overlap checks are ordinary `expectValue` declarations. Time values are presented in UTC; very large integers are preserved as strings. Cast DECIMAL values in expected-set queries explicitly if comparing against JavaScript numbers.

The runtime initializes the Wasm engine once, then reopens a fresh in-memory database and replaces registered files on each exercise switch/reset. Runs retain table state so learners can experiment with rerunnable transformations. Built-in solutions use `CREATE OR REPLACE`, and browser tests run each twice. A general declarative idempotency check, incremental arrival scheduler, advanced facts/dimensions, and more complex SCD2 inputs are future extensions.

## Verify

```sh
npx playwright install chromium
npm test
npm run build
```

Browser tests run the actual DuckDB-Wasm engine, verify that each starter fails, each solution passes twice, and exercise switching, resets, raw JSON, SQL errors, autocomplete, keyboard shortcuts, and mobile layout behave correctly. Screenshot artifacts are written under `test-results/`.

## GitHub Pages

The workflow in [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds, tests, and publishes the site with GitHub's official Pages actions.

1. Push this project (including `package-lock.json` and the workflow) to a GitHub repository.
2. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
3. Push to the repository's default branch, or select **Actions → Deploy to GitHub Pages → Run workflow** on that branch.
4. Open the site URL shown by the `github-pages` deployment environment.

The workflow uses Node.js 24 and `npm ci`, installs Chromium, and runs the browser tests against the production build before uploading the complete `dist/` folder. Deployment only runs after those checks pass. Pushes and manual runs on other branches are skipped. No custom secret or `gh-pages` branch is needed; deployment uses the built-in GitHub token with Pages/OIDC permissions.

Vite's relative `base: "./"` supports both a project URL (`https://OWNER.github.io/REPOSITORY/`) and a root/custom-domain site, including the DuckDB worker and Wasm assets. This workflow publishes only `dist/`, including the bundled reference solutions used by the reveal action.

For the one-time repository setup, see [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Static deployment

```sh
npm run build
npm run preview
```

Upload **the complete `dist/` folder**, including `assets/`, to a static host. Relative asset URLs support subdirectory deployments. Serve `.wasm` as `application/wasm` and enable gzip/Brotli for the large engine assets. Workers and both Wasm compatibility bundles are included locally; the browser selects one bundle. No CDN or cross-origin isolation headers are required. Expect a multi-megabyte first load, then fast queries over tiny fixtures. A fresh browser still needs the static files; this MVP does not install an offline service worker.

Implementation follows the [DuckDB-Wasm bundler initialization pattern](https://duckdb.org/docs/current/clients/wasm/instantiation) and [CodeMirror SQL language support](https://github.com/codemirror/lang-sql).
