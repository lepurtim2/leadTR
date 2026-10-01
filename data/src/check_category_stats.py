import duckdb

con = duckdb.connect()
print("Top Categories Breakdown across all 1.81M records:")
query = """
SELECT category_name, count(*) as total
FROM 'data/parquets/*.parquet'
GROUP BY category_name
ORDER BY total DESC
LIMIT 15;
"""
for r in con.execute(query).fetchall():
    print(f" - {r[0]}: {r[1]:,}")
