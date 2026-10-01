-- Make raw data a little more trustworthy.
CREATE OR REPLACE TABLE silver_customers AS
SELECT
    customer_id,
    name,
    email,
    updated_at
FROM bronze_customers;

SELECT * FROM silver_customers;
