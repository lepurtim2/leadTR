"""
LeadTR — Sync Web Enrichments into Parquet Lake
Propagates newly extracted corporate emails, WhatsApp lines, and websites
from `apps/api/data/enrichments.json` directly into `data/parquets/*.parquet`.
"""

import json
import os
import sys
import time
from typing import Dict, Any

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET_DIR = os.path.join(BASE_DIR, "parquets")
ENRICHMENTS_FILE = os.path.join(os.path.dirname(BASE_DIR), "apps", "api", "data", "enrichments.json")

def sync_enrichments():
    if not os.path.exists(ENRICHMENTS_FILE):
        print("No enrichments file found.")
        return

    with open(ENRICHMENTS_FILE, "r", encoding="utf-8") as f:
        enrichments: Dict[str, Any] = json.load(f)

    print(f"Loaded {len(enrichments):,} persistent enrichments to sync into lake...", flush=True)

    total_emails_synced = 0
    total_phones_synced = 0

    for file_name in sorted(os.listdir(PARQUET_DIR)):
        if not file_name.endswith(".parquet") or file_name.endswith(".tmp"):
            continue

        file_path = os.path.join(PARQUET_DIR, file_name)
        con = duckdb.connect()
        con.execute("PRAGMA enable_object_cache=false;")
        escaped = file_path.replace(os.sep, "/")
        rows = con.execute(f"SELECT * FROM '{escaped}'").fetchall()
        cols = [d[0] for d in con.description]
        col_idx = {name: i for i, name in enumerate(cols)}
        con.close()

        updated_records = []
        file_modified = False

        for r in rows:
            rec = {name: r[col_idx[name]] for name in cols}
            b_id = str(rec["id"])

            if b_id in enrichments:
                enr = enrichments[b_id]
                new_emails = enr.get("emails", [])
                new_phones = enr.get("phones", [])

                # Fill missing email
                if (not rec.get("email") or len(str(rec.get("email")).strip()) < 3) and new_emails:
                    rec["email"] = new_emails[0]
                    total_emails_synced += 1
                    file_modified = True

                # Fill missing phone
                if (not rec.get("phone") or len(str(rec.get("phone")).strip()) < 5) and new_phones:
                    rec["phone"] = new_phones[0]
                    rec["normalized_phone"] = new_phones[0]
                    rec["phone_type"] = "mobile"
                    total_phones_synced += 1
                    file_modified = True

                # Boost score
                rec["lead_score"] = min(100, int(rec.get("lead_score") or 75) + 10)
                rec["digital_presence_score"] = min(100, int(rec.get("digital_presence_score") or 70) + 15)

            updated_records.append(rec)

        if file_modified:
            table = pa.Table.from_pylist(updated_records)
            tmp_target = file_path + ".tmp"
            pq.write_table(table, tmp_target, compression="zstd")

            import gc
            gc.collect()
            time.sleep(0.1)

            try:
                os.replace(tmp_target, file_path)
            except PermissionError:
                with open(tmp_target, "rb") as src, open(file_path, "wb") as dst:
                    dst.write(src.read())
                try:
                    os.remove(tmp_target)
                except Exception:
                    pass

    print(f"[OK] Sync complete! Emails synced: {total_emails_synced:,} | Phones synced: {total_phones_synced:,}", flush=True)

if __name__ == "__main__":
    sync_enrichments()
