"""
LeadTR — Extract Extra Commercial Points from OSM PBF
Extracts pure industrial, corporate, and contact-bearing entities while strictly
excluding public transport, bus stops, barriers, railway and infrastructure.
"""

import os
import sys
import time
import duckdb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PBF_PATH = os.path.join(BASE_DIR, "turkey-latest.osm.pbf")
STAGING_PARQUET = os.path.join(BASE_DIR, "osm_extra_commercial_staging.parquet")
OSM_CONF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "osmconf.ini")

os.environ["OSM_CONFIG_FILE"] = OSM_CONF

def extract_staging():
    print(f"Connecting to DuckDB Spatial to extract clean commercial staging...", flush=True)
    con = duckdb.connect(':memory:')
    con.execute("INSTALL spatial; LOAD spatial;")

    extract_sql = f"""
    COPY (
        SELECT 
            osm_id,
            name,
            phone,
            website,
            other_tags,
            ST_X(geom) as lon,
            ST_Y(geom) as lat
        FROM ST_Read('{PBF_PATH.replace(os.sep, '/')}', layer='points')
        WHERE name IS NOT NULL
          AND length(trim(name)) >= 3
          AND amenity IS NULL 
          AND shop IS NULL 
          AND office IS NULL 
          AND leisure IS NULL 
          AND tourism IS NULL 
          AND craft IS NULL
          AND other_tags IS NOT NULL
          AND other_tags NOT LIKE '%"railway"%'
          AND other_tags NOT LIKE '%"public_transport"%'
          AND other_tags NOT LIKE '%"bus"%'
          AND other_tags NOT LIKE '%"barrier"%'
          AND other_tags NOT LIKE '%"highway"%'
          AND other_tags NOT LIKE '%"power"%'
          AND (
            other_tags LIKE '%"industrial"%'
            OR other_tags LIKE '%"factory"%'
            OR other_tags LIKE '%"company"%'
            OR other_tags LIKE '%"contact:phone"%'
            OR other_tags LIKE '%"contact:email"%'
            OR other_tags LIKE '%"contact:website"%'
          )
    ) TO '{STAGING_PARQUET.replace(os.sep, '/')}' (FORMAT PARQUET, COMPRESSION ZSTD);
    """

    t0 = time.time()
    con.execute(extract_sql)
    elapsed = time.time() - t0
    count = con.execute(f"SELECT count(*) FROM '{STAGING_PARQUET.replace(os.sep, '/')}'").fetchone()[0]
    print(f"✅ Extracted {count:,} clean commercial records to {STAGING_PARQUET} in {elapsed:.1f}s!", flush=True)
    con.close()

if __name__ == "__main__":
    extract_staging()
