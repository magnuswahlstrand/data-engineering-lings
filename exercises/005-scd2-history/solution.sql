CREATE OR REPLACE TABLE silver_customer_history AS
WITH versions AS (
    SELECT CAST(customer_id AS BIGINT) AS customer_id, name, email,
           CAST(updated_at AS TIMESTAMP) AS valid_from
    FROM bronze_customer_snapshots
), intervals AS (
    SELECT *, LEAD(valid_from) OVER (PARTITION BY customer_id ORDER BY valid_from) AS valid_to
    FROM versions
)
SELECT *, valid_to IS NULL AS is_current FROM intervals;
SELECT * FROM silver_customer_history;
