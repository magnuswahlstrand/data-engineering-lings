import { test, expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve("exercises");
const lessons = readdirSync(root)
  .sort()
  .map((dir) => ({
    dir,
    ...JSON.parse(readFileSync(resolve(root, dir, "exercise.json"), "utf8")),
  }));
async function setSql(page: Page, sql: string) {
  const editor = page.getByTestId("sql-editor");
  await editor.click();
  await editor.press(process.platform === "darwin" ? "Meta+a" : "Control+a");
  await editor.fill(sql);
}
async function run(page: Page) {
  await page.getByRole("button", { name: "Run & check" }).click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
}
test("all five lessons fail helpfully, pass on correct results, and survive reruns", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("DuckDB is ready")).toBeVisible({
    timeout: 60_000,
  });
  for (const [index, lesson] of lessons.entries()) {
    if (index)
      await page
        .getByRole("navigation", { name: "Exercises" })
        .getByRole("button")
        .nth(index)
        .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      lesson.title,
    );
    await expect(
      page.getByRole("button", { name: "Run & check" }),
    ).toBeEnabled();
    await run(page);
    await expect(page.getByText(/checks passed. Keep going/)).toBeVisible();
    await expect(page.locator(".check-item.fail").first()).toContainText(
      /EXPECTED|Catalog Error|Binder Error/i,
    );
    await setSql(
      page,
      readFileSync(resolve(root, lesson.dir, "solution.sql"), "utf8"),
    );
    await run(page);
    await expect(
      page.getByText("Nicely done. Every check passed."),
    ).toBeVisible();
    await run(page);
    await expect(
      page.getByText("Nicely done. Every check passed."),
    ).toBeVisible();
    await page.getByRole("tab", { name: /Tables/ }).click();
    await page.getByRole("button", { name: new RegExp(lesson.target) }).click();
    await expect(page.locator(".schema-chips")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(
      index === 0 || index === 1 ? 3 : index === 4 ? 4 : 2,
    );
  }
  await expect(page.getByText("5 of 5 completed")).toBeVisible();
  expect(errors).toEqual([]);
});
test("query errors recover, switching isolates data, resets restore starter, and shortcuts work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled({
    timeout: 60_000,
  });
  await setSql(page, "SELECT * FROM missing_table;");
  await run(page);
  await expect(page.getByRole("alert")).toContainText("missing_table");
  await setSql(
    page,
    readFileSync(resolve(root, lessons[0].dir, "solution.sql"), "utf8"),
  );
  await page
    .getByTestId("sql-editor")
    .press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");
  await expect(
    page.getByText("Nicely done. Every check passed."),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Exercises" })
    .getByRole("button")
    .nth(3)
    .click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
  await page.getByRole("tab", { name: /Tables/ }).click();
  await expect(
    page.getByRole("button", { name: /bronze_customers/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /silver_orders/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Raw data/ }).click();
  await expect(page.locator(".raw-source")).toContainText("49.50");
  await page
    .getByRole("navigation", { name: "Exercises" })
    .getByRole("button")
    .nth(0)
    .click();
  await expect(page.getByTestId("sql-editor")).toContainText(
    "all_varchar=true",
  );
  await page
    .getByRole("button", { name: "Reset exercise", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset exercise", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
  await expect(page.getByTestId("sql-editor")).not.toContainText(
    "all_varchar=true",
  );
  await expect(page.getByText("0 of 5 completed")).toBeVisible();
});
test("schema autocomplete, mobile layout, and screenshots", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled({
    timeout: 60_000,
  });
  await page.screenshot({
    path: "test-results/de-lings-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Exercises" })
    .getByRole("button")
    .nth(1)
    .click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
  await setSql(page, "SELECT * FROM bronze_");
  await page.getByTestId("sql-editor").press("Control+Space");
  await expect(
    page.getByRole("option", { name: "bronze_customers", exact: true }),
  ).toBeVisible();
  await page.getByTestId("sql-editor").press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/de-lings-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Run & check" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});

test("column checks explain missing aliases and reject missing or extra columns", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled({
    timeout: 60_000,
  });
  await page
    .getByRole("navigation", { name: "Exercises" })
    .getByRole("button")
    .nth(1)
    .click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
  const check = page
    .locator(".check-item")
    .filter({ hasText: "silver_customers has the expected columns" });
  // Reproduce the screenshot: transformed expressions without output aliases.
  await setSql(
    page,
    `CREATE OR REPLACE TABLE silver_customers AS
    SELECT customer_id, TRIM(name), email, TRY_CAST(updated_at AS TIMESTAMP)
    FROM bronze_customers;`,
  );
  await run(page);
  await expect(check).toHaveClass(/fail/);
  await expect(check).toContainText("Missing columns: name, updated_at.");
  await expect(check).toContainText("Unexpected columns:");
  await expect(check).toContainText(
    "TRY_CAST(updated_at AS TIMESTAMP) AS updated_at",
  );
  await expect(check.locator(".comparison")).toContainText("TRY_CAST");
  await expect(check.getByRole("table")).toHaveCount(0);
  for (const [select, message] of [
    ["customer_id, name, email", "Missing columns: updated_at."],
    ["*, 1 AS rn", "Unexpected columns: rn."],
  ]) {
    await setSql(
      page,
      `CREATE OR REPLACE TABLE silver_customers AS SELECT ${select} FROM bronze_customers;`,
    );
    await run(page);
    await expect(check).toHaveClass(/fail/);
    await expect(check).toContainText(message);
  }
  // Column order and the presence of rows do not affect the schema check.
  await setSql(
    page,
    `CREATE OR REPLACE TABLE silver_customers AS
    SELECT updated_at, email, name, customer_id FROM bronze_customers WHERE false;`,
  );
  await run(page);
  await expect(check).toHaveClass(/pass/);
  await setSql(page, "DROP TABLE silver_customers;");
  await run(page);
  await expect(check).toHaveClass(/fail/);
  await expect(check).toContainText("does not exist");
});

test("row diff highlights changed cells and completion prominently advances to the next exercise", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled({
    timeout: 60_000,
  });
  await page
    .getByRole("navigation", { name: "Exercises" })
    .getByRole("button")
    .nth(1)
    .click();
  await expect(page.getByRole("button", { name: "Run & check" })).toBeEnabled();
  const solution = readFileSync(
    resolve(root, lessons[1].dir, "solution.sql"),
    "utf8",
  );
  await setSql(page, solution.replace("TRIM(name) AS name", "name AS name"));
  await run(page);
  const countCheck = page
    .locator(".check-item")
    .filter({ hasText: "silver_customers has 3 rows" });
  await countCheck.locator("summary").click();
  await expect(countCheck.locator(".comparison")).toContainText("EXPECTED");
  await expect(countCheck.locator(".comparison")).toContainText("ACTUAL");
  await expect(countCheck.getByRole("table")).toHaveCount(0);
  const diff = page.getByRole("table", { name: "Row differences" });
  await expect(
    diff.getByRole("columnheader", { name: "name", exact: true }),
  ).toBeVisible();
  await expect(diff.locator(".diff-changed")).toHaveCount(3);
  await expect(diff.locator("del").first()).toContainText("Magnus");
  await expect(diff.locator("ins").first()).toContainText(" Magnus ");
  await page.screenshot({ path: "test-results/row-diff.png", fullPage: true });
  await setSql(page, solution);
  await run(page);
  const next = page.getByRole("region", { name: "Exercise complete" });
  await expect(next).toContainText(lessons[2].title);
  await expect(
    next.getByRole("button", { name: "Next exercise" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/next-exercise.png",
    fullPage: true,
  });
  await next.getByRole("button", { name: "Next exercise" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    lessons[2].title,
  );
});
