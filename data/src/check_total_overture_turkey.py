import duckdb

con = duckdb.connect()
con.execute("LOAD spatial; LOAD httpfs; SET s3_region='us-west-2';")

print("Checking total Turkey records in Overture S3 Geoparquet...")
query = """
SELECT count(*) 
FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*')
WHERE bbox.xmin >= 25.5 
  AND bbox.xmax <= 44.8 
  AND bbox.ymin >= 35.8 
  AND bbox.ymax <= 42.2
"""
res = con.execute(query).fetchall()
print(f"Total Overture POIs in Turkey bounding box: {res[0][0]:,}")
