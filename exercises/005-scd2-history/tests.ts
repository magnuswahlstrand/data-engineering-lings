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
    "silver_customer_history",
    ["customer_id", "name", "email", "valid_from", "valid_to", "is_current"],
    "Expose the required history columns with explicit aliases, including valid_from, valid_to, and is_current. Leave out helper columns.",
  ),
  expectRowCount(
    "silver_customer_history",
    4,
    "SCD2 preserves historical versions instead of deduplicating them away.",
  ),
  expectUnique(
    "silver_customer_history",
    ["customer_id", "valid_from"],
    "A customer can have many versions, but only one at any given start time.",
  ),
  expectNotNull(
    "silver_customer_history",
    ["customer_id", "valid_from", "is_current"],
    "Every version needs a key, a start time, and a current flag.",
  ),
  expectValue(
    "SELECT COUNT(*) FROM (SELECT customer_id FROM silver_customer_history GROUP BY customer_id HAVING COUNT(*) FILTER (WHERE is_current) <> 1)",
    0,
    "Exactly one current version per customer",
    "Only the latest version for each customer should be marked current.",
  ),
  expectValue(
    "SELECT COUNT(*) FROM silver_customer_history a JOIN silver_customer_history b ON a.customer_id=b.customer_id AND a.valid_from < b.valid_from AND (a.valid_to IS NULL OR a.valid_to > b.valid_from)",
    0,
    "Validity intervals never overlap",
    "A historical version ends exactly when the next one starts.",
  ),
  expectRows(
    "SELECT * FROM silver_customer_history",
    [
      {
        customer_id: 1,
        name: "Magnus",
        email: "magnus@example.com",
        valid_from: "2026-09-01 10:00:00",
        valid_to: "2026-09-05 09:00:00",
        is_current: false,
      },
      {
        customer_id: 1,
        name: "Magnus",
        email: "magnus@newmail.com",
        valid_from: "2026-09-05 09:00:00",
        valid_to: "2026-09-10 08:00:00",
        is_current: false,
      },
      {
        customer_id: 1,
        name: "Magnus W",
        email: "magnus@newmail.com",
        valid_from: "2026-09-10 08:00:00",
        valid_to: null,
        is_current: true,
      },
      {
        customer_id: 2,
        name: "Alice",
        email: "alice@example.com",
        valid_from: "2026-09-01 12:00:00",
        valid_to: null,
        is_current: true,
      },
    ],
    "History matches every snapshot",
    "Use typed timestamps and LEAD within each customer; retain the name and email of each version.",
    ["customer_id", "valid_from"],
  ),
];
