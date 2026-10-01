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
    2,
    "There are two distinct customers; retain only the latest record per customer.",
  ),
  expectUnique(
    "silver_customers",
    ["customer_id"],
    "Rank records within each customer, then retain just rank 1.",
  ),
  expectNotNull(
    "silver_customers",
    ["customer_id", "updated_at"],
    "Each current record needs a stable customer key and source timestamp.",
  ),
  expectValue(
    "SELECT data_type FROM information_schema.columns WHERE table_name='silver_customers' AND column_name='customer_id'",
    "BIGINT",
    "Customer IDs are BIGINT",
    "Use an integer key, rather than the raw text ID.",
  ),
  expectValue(
    "SELECT data_type FROM information_schema.columns WHERE table_name='silver_customers' AND column_name='updated_at'",
    "TIMESTAMP",
    "Update times are TIMESTAMP",
    "Parse source times before ranking records.",
  ),
  expectRows(
    "SELECT * FROM silver_customers",
    [
      {
        customer_id: 1,
        name: "Magnus",
        email: "magnus@example.com",
        updated_at: "2026-09-02 10:00:00",
      },
      {
        customer_id: 2,
        name: "Alice",
        email: "alice@example.com",
        updated_at: "2026-09-01 12:00:00",
      },
    ],
    "The latest clean record wins",
    "Customer 1 must retain the September 2 update. Exclude helper ranking columns.",
    ["customer_id"],
  ),
];
