-- Your first landing zone.
-- Load customers.csv without changing the data.

CREATE OR REPLACE TABLE bronze_customers AS
SELECT *
FROM read_csv('customers.csv', header = true);

SELECT * FROM bronze_customers;
