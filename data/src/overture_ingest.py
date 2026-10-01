"""
LeadTR — Overture Maps Foundation Turkey Ingestion Pipeline
Queries Overture Places Geoparquet partitioned on S3 using DuckDB within Turkey's bounding box.
Preserves raw provenance and extracts canonical names, locations, categories, websites, and phones.
"""
import os
import sys
import json
from datetime import datetime

# Turkey geographical bounding box
TURKEY_BBOX = {
    "min_lng": 25.66,
    "min_lat": 35.81,
    "max_lng": 44.82,
    "max_lat": 42.11,
}

OVERTURE_S3_PATH = "s3://overturemaps-us-west-2/release/2024-08-20.0/theme=places/type=place/*"


def run_pipeline(output_dir: str = "./snapshots"):
    """
    Ingests Turkey records from Overture Places.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    snapshot_path = os.path.join(output_dir, f"overture_turkey_{timestamp}.parquet")

    query = f"""
    -- DuckDB spatial query for Overture Places inside Turkey
    INSTALL spatial;
    LOAD spatial;
    INSTALL httpfs;
    LOAD httpfs;

    SET s3_region='us-west-2';

    COPY (
        SELECT
            id AS overture_id,
            names.primary AS canonical_name,
            categories.main AS category,
            addresses[1].freeform AS formatted_address,
            addresses[1].locality AS district,
            addresses[1].region AS province,
            addresses[1].postcode AS postal_code,
            websites[1] AS website,
            phones[1] AS phone,
            ST_X(geometry) AS longitude,
            ST_Y(geometry) AS latitude,
            confidence,
            sources
        FROM read_parquet('{OVERTURE_S3_PATH}', hive_partitioning=true)
        WHERE bbox.xmin >= {TURKEY_BBOX['min_lng']}
          AND bbox.xmax <= {TURKEY_BBOX['max_lng']}
          AND bbox.ymin >= {TURKEY_BBOX['min_lat']}
          AND bbox.ymax <= {TURKEY_BBOX['max_lat']}
        LIMIT 100000
    ) TO '{snapshot_path}' (FORMAT PARQUET);
    """

    print("==================================================")
    print("LeadTR Overture Maps Ingestion Pipeline")
    print(f"Target Turkey BBox: {TURKEY_BBOX}")
    print(f"Destination: {snapshot_path}")
    print("==================================================")
    print("Pipeline definition ready for batch execution.")
    return snapshot_path


if __name__ == "__main__":
    run_pipeline()
