import sys
import duckdb

sys.stdout.reconfigure(encoding='utf-8')

con = duckdb.connect()
con.execute("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")

print("Checking Central Anatolia (Ankara/Konya) missing-country places in Overture...", flush=True)

query = """
SELECT 
    names.primary as name,
    taxonomy.primary as category,
    addresses[1].region as region,
    addresses[1].locality as locality,
    addresses[1].country as country,
    addresses[1].freeform as address,
    phones[1] as phone,
    websites[1] as website,
    bbox.xmin as lon,
    bbox.ymin as lat
FROM read_parquet('s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*', hive_partitioning=1)
WHERE bbox.xmin >= 32.0 
  AND bbox.xmax <= 33.5 
  AND bbox.ymin >= 39.5 
  AND bbox.ymax <= 40.2
  AND names.primary IS NOT NULL
  AND (addresses[1].country IS NULL OR addresses[1].country != 'TR')
LIMIT 10
"""

rows = con.execute(query).fetchall()
print(f"Sample of records without 'country=TR' in Ankara sector (Total sampled: {len(rows)}):", flush=True)
for i, r in enumerate(rows, 1):
    print(f"{i}. Name: {r[0]} | Cat: {r[1]} | Country: {r[4]} | Region: {r[2]} | City: {r[3]} | Phone: {r[6]} | Lat/Lon: {r[9]:.2f}, {r[8]:.2f}", flush=True)
