"""
LeadTR — National Multi-Sector Expansion Batch Engine
Module: data/src/national_expansion_batch.py

Runs multi-sector ingestion & deduplication for any specified sector or all 17 sectors.
Fetches high-density commercial hubs, cleans garbage, merges existing duplicates (enriching missing phones/web),
and appends new verified leads with atomic Parquet commits.
"""

import os
import sys
import time
import argparse
from multi_source_harvester import MultiSourceHarvester

sys.stdout.reconfigure(encoding='utf-8')

# Key commercial hub coordinates for each sector: (province, district, "south,west,north,east")
SECTOR_HUBS = {
    "sector_01_istanbul_marmara_dogu.parquet": [
        ("İstanbul", "Kadıköy", "40.97,29.02,41.00,29.07"),
        ("İstanbul", "Şişli", "41.05,28.97,41.08,29.01"),
        ("İstanbul", "Beşiktaş", "41.04,29.00,41.08,29.05"),
        ("İstanbul", "Ümraniye", "41.01,29.08,41.04,29.13"),
        ("İstanbul", "Fatih", "41.00,28.93,41.03,28.98"),
        ("Kocaeli", "İzmit", "40.75,29.90,40.78,29.96"),
        ("Sakarya", "Adapazarı", "40.76,30.38,40.79,30.43"),
    ],
    "sector_03_guney_marmara.parquet": [
        ("Bursa", "Osmangazi", "40.18,29.04,40.21,29.09"),
        ("Bursa", "Nilüfer", "40.20,28.94,40.23,29.00"),
        ("Balıkesir", "Karesi", "39.63,27.87,39.66,27.91"),
    ],
    "sector_04_ege_kuzey.parquet": [
        ("İzmir", "Konak", "38.40,27.12,38.43,27.16"),
        ("İzmir", "Karşıyaka", "38.45,27.10,38.48,27.14"),
        ("İzmir", "Bornova", "38.45,27.20,38.48,27.24"),
        ("Manisa", "Yunusemre", "38.60,27.39,38.63,27.44"),
    ],
    "sector_06_akdeniz_bati.parquet": [
        ("Antalya", "Muratpaşa", "36.87,30.69,36.90,30.73"),
        ("Antalya", "Kepez", "36.91,30.67,36.94,30.71"),
        ("Antalya", "Konyaaltı", "36.87,30.62,36.90,30.66"),
    ],
    "sector_07_akdeniz_dogu.parquet": [
        ("Adana", "Seyhan", "36.98,35.30,37.01,35.34"),
        ("Mersin", "Yenişehir", "36.78,34.58,36.81,34.62"),
        ("Hatay", "Antakya", "36.19,36.14,36.22,36.18"),
    ],
    "sector_08_ic_anadolu_merkez.parquet": [
        ("Ankara", "Çankaya", "39.89,32.84,39.92,32.88"),
        ("Ankara", "Yenimahalle", "39.95,32.78,39.98,32.83"),
        ("Ankara", "Keçiören", "39.96,32.85,39.99,32.89"),
        ("Eskişehir", "Tepebaşı", "39.77,30.50,39.80,30.54"),
    ],
    "sector_09_ic_anadolu_guney.parquet": [
        ("Konya", "Selçuklu", "37.88,32.48,37.91,32.53"),
        ("Konya", "Meram", "37.84,32.46,37.87,32.50"),
    ],
    "sector_10_ic_anadolu_dogu.parquet": [
        ("Kayseri", "Melikgazi", "38.71,35.48,38.74,35.52"),
        ("Sivas", "Merkez", "39.74,37.00,39.77,37.04"),
    ],
    "sector_11_guneydogu_bati.parquet": [
        ("Gaziantep", "Şahinbey", "37.04,37.36,37.07,37.40"),
        ("Gaziantep", "Şehitkamil", "37.07,37.34,37.10,37.38"),
        ("Şanlıurfa", "Haliliye", "37.15,38.78,37.18,38.82"),
    ],
    "sector_12_guneydogu_dogu.parquet": [
        ("Diyarbakır", "Kayapınar", "37.93,40.16,37.96,40.20"),
        ("Diyarbakır", "Bağlar", "37.90,40.18,37.93,40.22"),
    ],
    "sector_14_karadeniz_orta.parquet": [
        ("Samsun", "İlkadım", "41.27,36.32,41.30,36.36"),
        ("Ordu", "Altınordu", "40.97,37.86,41.00,37.90"),
    ],
    "sector_15_karadeniz_dogu.parquet": [
        ("Trabzon", "Ortahisar", "40.99,39.71,41.02,39.75"),
        ("Rize", "Merkez", "41.01,40.50,41.04,40.54"),
    ],
}


def run_sector_expansion(sector_filename: str):
    hubs = SECTOR_HUBS.get(sector_filename)
    if not hubs:
        print(f"No configured commercial hubs for {sector_filename}.")
        return

    print(f"\n=======================================================")
    print(f" Processing Sector: {sector_filename}")
    print(f" Total Hubs to Harvest: {len(hubs)}")
    print(f"=======================================================\n")

    harvester = MultiSourceHarvester()
    try:
        harvester.load_sector_parquet(sector_filename)
    except FileNotFoundError:
        print(f"Sector file {sector_filename} not found. Skipping.")
        return

    for prov, dist, bbox in hubs:
        time.sleep(1.5)  # Throttling to respect Overpass rate limits
        candidates = harvester.harvest_osm_area(
            bbox_str=bbox,
            province_name=prov,
            district_name=dist,
            limit_per_category=40
        )
        if candidates:
            harvester.process_and_deduplicate(
                raw_candidates=candidates,
                default_province=prov,
                default_district=dist
            )

    harvester.print_summary()
    harvester.commit_to_parquet(sector_filename)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LeadTR National Multi-Sector Expansion Batch Engine")
    parser.add_argument("--sector", type=str, default="sector_08_ic_anadolu_merkez.parquet",
                        help="Specific sector filename to expand, or 'all' for all configured sectors.")
    args = parser.parse_args()

    if args.sector == "all":
        for sec in SECTOR_HUBS.keys():
            run_sector_expansion(sec)
    else:
        run_sector_expansion(args.sector)
