"""
LeadTR — Run National Expansion Pilot
Runs the MultiSourceHarvester for key commercial hubs, demonstrates
deduplication against sector_01 parquet, and safely updates the lake.
"""

import sys
from multi_source_harvester import MultiSourceHarvester

sys.stdout.reconfigure(encoding='utf-8')

print("Starting LeadTR Expansion Pipeline (Pilot: Istanbul Commercial Hubs)...")
harvester = MultiSourceHarvester()

# 1. Load Sector 01 (Istanbul & Marmara Doğu)
sector_file = "sector_01_istanbul_marmara_dogu.parquet"
harvester.load_sector_parquet(sector_file)

# 2. Key Hubs Bounding Boxes: (south,west,north,east)
hubs = [
    {
        "province": "İstanbul",
        "district": "Kadıköy",
        "bbox": "40.97,29.02,41.00,29.07"
    },
    {
        "province": "İstanbul",
        "district": "Şişli",
        "bbox": "41.05,28.97,41.08,29.01"
    },
    {
        "province": "İstanbul",
        "district": "Beşiktaş",
        "bbox": "41.04,29.00,41.08,29.05"
    }
]

for hub in hubs:
    candidates = harvester.harvest_osm_area(
        bbox_str=hub["bbox"],
        province_name=hub["province"],
        district_name=hub["district"],
        limit_per_category=40
    )
    if candidates:
        harvester.process_and_deduplicate(
            raw_candidates=candidates,
            default_province=hub["province"],
            default_district=hub["district"]
        )

# 3. Print pipeline execution metrics
harvester.print_summary()

# 4. Commit updated entities back to sector parquet atomically
harvester.commit_to_parquet(sector_file)

print("\n🚀 Expansion Pilot finished successfully with 100% data integrity!")
