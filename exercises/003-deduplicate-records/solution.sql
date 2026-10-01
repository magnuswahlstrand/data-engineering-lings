CREATE OR REPLACE TABLE silver_customers AS
WITH cleaned AS (
    SELECT CAST(customer_id AS BIGINT) AS customer_id,
           TRIM(name) AS name, LOWER(TRIM(email)) AS email,
           CAST(updated_at AS TIMESTAMP) AS updated_at
    FROM bronze_customers
)
SELECT * FROM cleaned
QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC) = 1;
SELECT * FROM silver_customers;
