CREATE OR REPLACE TABLE bronze_customers AS
SELECT * FROM read_csv('customers.csv', header=true, all_varchar=true);
SELECT * FROM bronze_customers;
