CREATE OR REPLACE TABLE silver_customers AS
SELECT CAST(customer_id AS BIGINT) AS customer_id,
       TRIM(name) AS name,
       LOWER(NULLIF(TRIM(email), '')) AS email,
       TRY_CAST(updated_at AS TIMESTAMP) AS updated_at
FROM bronze_customers;
SELECT * FROM silver_customers;
