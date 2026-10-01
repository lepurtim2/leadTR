import duckdb

con = duckdb.connect()
con.execute("LOAD spatial; LOAD httpfs; SET s3_region='us-west-2';")

query = """
SELECT 
    addresses[1].country as country,
    count(*) as count
FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*')
WHERE bbox.xmin >= 26.0 AND bbox.xmax <= 31.0 
  AND bbox.ymin >= 36.6 AND bbox.ymax <= 39.8
GROUP BY addresses[1].country
ORDER BY count DESC
"""
res = con.execute(query).fetchall()
for r in res:
    print(r)
