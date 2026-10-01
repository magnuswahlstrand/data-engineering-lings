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
    "bronze_customers",
    ["customer_id", "name", "email", "updated_at"],
    "Preserve all four CSV header names in the Bronze table.",
  ),
  expectRowCount(
    "bronze_customers",
    3,
    "Bronze keeps every source row, including duplicate customers.",
  ),
  expectValue(
    "SELECT count(*) FROM information_schema.columns WHERE table_name = 'bronze_customers' AND data_type = 'VARCHAR'",
    4,
    "All 4 columns stay raw text",
    "CSV type inference can change raw values. Set all_varchar = true when reading the file.",
  ),
  expectRows(
    "SELECT * FROM bronze_customers",
    [
      {
        customer_id: "1",
        name: " Magnus ",
        email: "MAGNUS@example.com",
        updated_at: "2026-09-01 10:00",
      },
      {
        customer_id: "1",
        name: "Magnus",
        email: "magnus@example.com",
        updated_at: "2026-09-02 10:00",
      },
      {
        customer_id: "2",
        name: "Alice ",
        email: "alice@example.com",
        updated_at: "2026-09-01 12:00",
      },
    ],
    "Source values are preserved",
    "The landing layer is a faithful copy. Preserve spaces, casing, and the original timestamp strings.",
    ["customer_id", "updated_at"],
  ),
];
