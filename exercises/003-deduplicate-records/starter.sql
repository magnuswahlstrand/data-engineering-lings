-- Two records belong to the same customer.
-- Clean them, then keep the latest one.
CREATE OR REPLACE TABLE silver_customers AS
SELECT
    CAST(customer_id AS BIGINT) AS customer_id,
    TRIM(name) AS name,
    LOWER(TRIM(email)) AS email,
    CAST(updated_at AS TIMESTAMP) AS updated_at
FROM bronze_customers;

SELECT * FROM silver_customers;
