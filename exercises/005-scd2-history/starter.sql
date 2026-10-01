-- Keep every version. Give each one a validity interval.
CREATE OR REPLACE TABLE silver_customer_history AS
SELECT
    CAST(customer_id AS BIGINT) AS customer_id,
    name,
    email,
    CAST(updated_at AS TIMESTAMP) AS valid_from,
    NULL::TIMESTAMP AS valid_to,
    TRUE AS is_current
FROM bronze_customer_snapshots;

SELECT * FROM silver_customer_history;
