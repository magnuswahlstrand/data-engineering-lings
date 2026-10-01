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
    "gold_customer_revenue",
    ["customer_id", "order_count", "total_revenue"],
    "Name the aggregate expressions explicitly: COUNT(*) AS order_count and SUM(amount) AS total_revenue.",
  ),
  expectRowCount(
    "gold_customer_revenue",
    2,
    "The mart should have one row per customer, not one row per order.",
  ),
  expectUnique(
    "gold_customer_revenue",
    ["customer_id"],
    "Aggregate all orders belonging to the same customer.",
  ),
  expectValue(
    "SELECT CAST(SUM(total_revenue) AS DOUBLE) FROM gold_customer_revenue",
    120,
    "Revenue reconciles to 120.00",
    "Aggregating must not drop or double-count any order.",
  ),
  expectRows(
    "SELECT customer_id, order_count, CAST(total_revenue AS DOUBLE) AS total_revenue FROM gold_customer_revenue",
    [
      { customer_id: 1, order_count: 2, total_revenue: 70 },
      { customer_id: 2, order_count: 2, total_revenue: 50 },
    ],
    "Customer totals match the source orders",
    "Both customers have two orders. Their revenue totals are 70.00 and 50.00.",
    ["customer_id"],
  ),
];
