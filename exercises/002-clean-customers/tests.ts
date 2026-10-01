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
    "silver_customers",
    ["customer_id", "name", "email", "updated_at"],
    "Keep these output names. Alias transformed expressions explicitly, such as TRIM(name) AS name and TRY_CAST(updated_at AS TIMESTAMP) AS updated_at.",
  ),
  expectRowCount(
    "silver_customers",
    3,
    "Cleaning should keep the original records, even when a field is malformed.",
  ),
  expectValue(
    "SELECT data_type FROM information_schema.columns WHERE table_name='silver_customers' AND column_name='customer_id'",
    "BIGINT",
    "Customer IDs have an integer type",
    "Cast the raw ID to BIGINT; a numeric-looking string is still text.",
  ),
  expectValue(
    "SELECT data_type FROM information_schema.columns WHERE table_name='silver_customers' AND column_name='updated_at'",
    "TIMESTAMP",
    "Timestamps have a timestamp type",
    "Use TRY_CAST so malformed timestamps become NULL without losing the row.",
  ),
  expectRows(
    "SELECT * FROM silver_customers",
    [
      {
        customer_id: 1,
        name: "Magnus",
        email: "magnus@example.com",
        updated_at: "2026-09-01 10:00:00",
      },
      {
        customer_id: 2,
        name: "Alice",
        email: "alice@example.com",
        updated_at: "2026-09-01 12:00:00",
      },
      { customer_id: 3, name: "Bob", email: null, updated_at: null },
    ],
    "Cleaned values match the expected records",
    "Trim names, normalize email casing, and use NULL for blank emails and malformed timestamps.",
    ["customer_id"],
  ),
];
