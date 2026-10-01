import duckdb
import os

p = "data/osm_extra_commercial_staging.parquet"
if os.path.exists(p):
    con = duckdb.connect()
    count = con.execute("SELECT count(*) FROM 'data/osm_extra_commercial_staging.parquet'").fetchone()[0]
    print(f"Staging file size: {os.path.getsize(p):,} bytes")
    print(f"Staging row count: {count:,}")
    sample = con.execute("SELECT osm_id, name, phone, website, other_tags, lon, lat FROM 'data/osm_extra_commercial_staging.parquet' LIMIT 5").fetchall()
    print("\nSample records:")
    for s in sample:
        print(s[0], s[1], "Phone:", s[2], "Web:", s[3], "Coord:", (s[5], s[6]))
    con.close()
else:
    print("Staging file does not exist!")
