CREATE OR REPLACE TABLE gold_customer_revenue AS
SELECT customer_id, COUNT(*) AS order_count, SUM(amount) AS total_revenue
FROM silver_orders GROUP BY customer_id;
SELECT * FROM gold_customer_revenue;
