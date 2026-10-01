-- Silver orders are ready. Build a business-facing mart.
CREATE OR REPLACE TABLE gold_customer_revenue AS
SELECT
    customer_id,
    amount AS total_revenue
FROM silver_orders;

SELECT * FROM gold_customer_revenue;
