"""
LeadTR — Enterprise Entity Resolution & Deduplication Engine
Module: data/src/entity_resolver.py
Purpose: Fast, deterministic & fuzzy deduplication to merge records from multi-sources
         (Overture, OpenStreetMap, Official Registries, Vertical Directories)
         without duplicate businesses and without dirty/fake data.
"""

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple, Any

from normalizers import (
    normalize_turkish_text,
    normalize_business_name,
    normalize_turkish_phone
)

# ---------------------------------------------------------------------------
# Data Cleaning & Sanitation Rules
# ---------------------------------------------------------------------------

INVALID_NAME_PATTERNS = [
    r"^isimsiz\b",
    r"^bilinmeyen\b",
    r"^adsiz\b",
    r"^no\s*name\b",
    r"^unknown\b",
    r"^unnamed\b",
    r"^durak\b",
    r"^otobus\s+duragi\b",
    r"^dolmus\s+duragi\b",
    r"^taksi\s+duragi\b",
    r"^trafik\s+isigi\b",
    r"^cop\s+kutusu\b",
    r"^bankamatik\b",
    r"^atm\b",
    r"^wc\b",
    r"^tuvalet\b",
    r"^cami\s+abdesthane\b",
    r"^\d+$",  # purely numeric
]

FOREIGN_ISLAND_KEYWORDS = [
    "symi", "simi", "kos", "rhodes", "rodos", "chios", "lesbos", "samos",
    "kefalos", "kardamena", "mastichari", "antimachia", "nisyros", "corfu",
    "crete", "heraklion", "santorini", "mykonos", "mytilene", "greece", "el"
]

# LeadTR 27 Canonical Category Slugs Mapping
CATEGORY_MAP: Dict[str, Tuple[str, str]] = {
    # Medical & Health
    "dentist": ("Diş Hekimi", "dis-hekimi"),
    "dental_clinic": ("Diş Kliniği", "dis-klinigi"),
    "clinic": ("Klinik", "klinik"),
    "hospital": ("Hastane", "hastane"),
    "pharmacy": ("Eczane", "eczane"),
    "veterinary": ("Veteriner Kliniği", "veteriner"),
    "optician": ("Optik & Gözlükçü", "optik"),
    
    # Legal & Financial
    "law_firm": ("Hukuk Bürosu", "hukuk-burosu"),
    "lawyer": ("Avukat", "avukat"),
    "notary": ("Noter", "noter"),
    "bank": ("Banka & Finans", "banka"),
    "accounting": ("Mali Müşavir & Muhasebe", "muhasebe"),
    "insurance": ("Sigorta Acentesi", "sigorta"),
    
    # Real Estate & Home
    "real_estate_agency": ("Emlak Ofisi", "emlak-ofisi"),
    "hardware_store": ("Nalburiye & Hırdavat", "nalburiye"),
    
    # Automotive
    "car_repair": ("Oto Servis & Tamir", "oto-servis"),
    "car_wash": ("Oto Yıkama", "oto-yikama"),
    "gas_station": ("Akaryakıt İstasyonu", "akaryakit"),
    
    # Food & Hospitality
    "restaurant": ("Restoran & Lokanta", "restoran"),
    "cafe": ("Kafe", "kafe"),
    "fast_food": ("Fast Food", "fast-food"),
    "bakery": ("Fırın & Pastane", "firincilik"),
    "hotel": ("Otel & Konaklama", "otel"),
    
    # Personal Care & Lifestyle
    "hairdresser": ("Kuaför & Berber", "kuafor"),
    "beauty_salon": ("Güzellik Merkezi", "guzellik-merkezi"),
    "gym": ("Spor Salonu", "spor-salonu"),
    "jewelry": ("Kuyumcu & Sarraf", "kuyumcu"),
    
    # Retail & Logistics
    "supermarket": ("Süpermarket & Bakkal", "supermarket"),
    "courier": ("Kargo & Lojistik", "kargo"),
}


def extract_root_domain(url: Optional[str]) -> Optional[str]:
    """Extract clean root domain (e.g., 'klinik.com.tr') from URL."""
    if not url:
        return None
    url = url.strip().lower()
    url = re.sub(r"^https?://", "", url)
    url = re.sub(r"^www\.", "", url)
    domain = url.split("/")[0].split("?")[0].split(":")[0]
    return domain if "." in domain and len(domain) > 3 else None


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geographic distance in meters between two lat/lon coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def name_similarity_score(name1: str, name2: str) -> float:
    """
    Computes token-based and character-based similarity score (0.0 to 1.0).
    Robust against legal suffixes and minor reordering.
    """
    n1 = normalize_business_name(name1)
    n2 = normalize_business_name(name2)

    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 1.0

    tokens1 = set(n1.split())
    tokens2 = set(n2.split())

    if not tokens1 or not tokens2:
        return 0.0

    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    jaccard = len(intersection) / len(union)

    # Substring containment bonus (e.g. 'Kadıköy Diş' vs 'Özel Kadıköy Diş Polikliniği')
    if n1 in n2 or n2 in n1:
        return max(jaccard, 0.88)

    # Token overlap ratio relative to the shorter name
    overlap_shorter = len(intersection) / min(len(tokens1), len(tokens2))
    return max(jaccard, overlap_shorter * 0.85)


# ---------------------------------------------------------------------------
# Business Record Dataclass
# ---------------------------------------------------------------------------

@dataclass
class BusinessEntity:
    id: str
    canonical_name: str
    category_name: str
    category_slug: str
    province: str
    province_normalized: str
    district: str
    district_normalized: str
    formatted_address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    normalized_phone: Optional[str] = None
    phone_type: str = "unknown"
    website: Optional[str] = None
    domain: Optional[str] = None
    email: Optional[str] = None
    source_name: str = "overture"
    source_record_id: Optional[str] = None
    source_count: int = 1
    lead_score: int = 75
    completeness_score: int = 80
    digital_presence_score: int = 70
    freshness_score: int = 90
    identity_confidence: int = 95
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
    normalized_name: str = ""
    name_tokens: Set[str] = field(default_factory=set)

    def __post_init__(self):
        if not self.normalized_name:
            self.normalized_name = normalize_business_name(self.canonical_name)
        if not self.name_tokens:
            self.name_tokens = set(self.normalized_name.split())


# ---------------------------------------------------------------------------
# Entity Resolution & Deduplication Engine
# ---------------------------------------------------------------------------

class EntityResolutionEngine:
    """
    High-throughput deduplication engine.
    Uses multi-stage spatial & inverted indexing (phone, domain, geo-grid)
    for sub-millisecond duplicate checks.
    """

    def __init__(self):
        # Inverted index: normalized_phone -> BusinessEntity
        self.phone_index: Dict[str, BusinessEntity] = {}
        # Inverted index: root_domain -> BusinessEntity
        self.domain_index: Dict[str, BusinessEntity] = {}
        # Spatial Grid Index: (lat_grid, lon_grid) -> List[BusinessEntity] (Grid ~200m)
        self.spatial_grid: Dict[Tuple[int, int], List[BusinessEntity]] = {}
        # All entities dict: id -> BusinessEntity
        self.entities: Dict[str, BusinessEntity] = {}

    def _get_grid_key(self, lat: float, lon: float) -> Tuple[int, int]:
        """Convert lat/lon to ~200m spatial bucket key (0.002 deg ~= 220m)."""
        return (int(round(lat * 500)), int(round(lon * 500)))

    def is_valid_record(self, name: Optional[str], lat: Optional[float], lon: Optional[float], address: Optional[str] = None) -> bool:
        """Sanitizes candidate records to discard garbage / non-businesses."""
        if not name or len(name.strip()) < 3:
            return False

        norm_name = normalize_turkish_text(name)
        if len(norm_name) < 2:
            return False

        # Pattern check for garbage POIs
        for pattern in INVALID_NAME_PATTERNS:
            if re.search(pattern, norm_name):
                return False

        # Coordinate check for Turkey bounds
        if lat is None or lon is None:
            return False
        if not (35.5 <= lat <= 42.5 and 25.5 <= lon <= 45.0):
            return False

        # Check foreign island leaks
        full_text = f"{norm_name} {normalize_turkish_text(address or '')}"
        for kw in FOREIGN_ISLAND_KEYWORDS:
            if kw in full_text:
                return False

        return True

    def register_existing_entity(self, entity: BusinessEntity):
        """Indexes an existing entity into lookup tables."""
        self.entities[entity.id] = entity

        if entity.normalized_phone:
            self.phone_index[entity.normalized_phone] = entity

        if entity.domain:
            self.domain_index[entity.domain] = entity

        g_key = self._get_grid_key(entity.latitude, entity.longitude)
        if g_key not in self.spatial_grid:
            self.spatial_grid[g_key] = []
        self.spatial_grid[g_key].append(entity)

    def find_match(
        self,
        name: str,
        lat: float,
        lon: float,
        phone: Optional[str] = None,
        website: Optional[str] = None,
        province: Optional[str] = None,
    ) -> Tuple[Optional[BusinessEntity], int, str]:
        """
        Attempts to match candidate record against indexed entities.
        Returns (matched_entity, match_score, match_reason).
        """
        # 1. Deterministic Match: Phone Number
        if phone:
            norm_phone, _ = normalize_turkish_phone(phone)
            if norm_phone and norm_phone in self.phone_index:
                matched = self.phone_index[norm_phone]
                return matched, 98, "exact_phone_match"

        # 2. Deterministic Match: Root Domain
        if website:
            domain = extract_root_domain(website)
            if domain and domain in self.domain_index:
                matched = self.domain_index[domain]
                return matched, 95, "exact_domain_match"

        # 3. Spatial & Fuzzy Candidate Generation
        g_key = self._get_grid_key(lat, lon)
        neighbor_keys = [
            (g_key[0] + dx, g_key[1] + dy)
            for dx in (-1, 0, 1)
            for dy in (-1, 0, 1)
        ]

        cand_norm = normalize_business_name(name)
        cand_tokens = set(cand_norm.split())

        best_entity = None
        best_score = 0
        best_reason = ""

        # 150m is approx 0.0015 degrees lat, 0.0019 degrees lon
        for key in neighbor_keys:
            bucket = self.spatial_grid.get(key, [])
            for candidate in bucket:
                if abs(lat - candidate.latitude) > 0.0018 or abs(lon - candidate.longitude) > 0.0022:
                    continue

                dist = haversine_distance_meters(lat, lon, candidate.latitude, candidate.longitude)
                if dist > 150.0:
                    continue

                # Fast token similarity
                if cand_norm == candidate.normalized_name:
                    sim = 1.0
                elif cand_norm in candidate.normalized_name or candidate.normalized_name in cand_norm:
                    sim = 0.90
                elif not cand_tokens or not candidate.name_tokens:
                    sim = 0.0
                else:
                    intersection = len(cand_tokens.intersection(candidate.name_tokens))
                    sim = intersection / min(len(cand_tokens), len(candidate.name_tokens))

                # Distance <= 50m and name similarity >= 0.80
                if dist <= 50.0 and sim >= 0.80:
                    score = int(70 + (sim * 25))
                    if score > best_score:
                        best_score = score
                        best_entity = candidate
                        best_reason = f"proximity_{dist:.0f}m_sim_{sim:.2f}"

                # Distance <= 120m and very strong name similarity >= 0.90
                elif dist <= 120.0 and sim >= 0.90:
                    score = int(60 + (sim * 25))
                    if score > best_score:
                        best_score = score
                        best_entity = candidate
                        best_reason = f"proximity_{dist:.0f}m_high_sim_{sim:.2f}"

        if best_score >= 80:
            return best_entity, best_score, best_reason

        return None, 0, "no_match"

    def merge_or_insert(
        self,
        candidate: BusinessEntity,
    ) -> Tuple[bool, BusinessEntity]:
        """
        Evaluates candidate:
        - If matched (duplicate) -> merges missing fields into existing entity, returns (False, existing)
        - If not matched -> indexes candidate as new entity, returns (True, candidate)
        """
        matched, score, reason = self.find_match(
            name=candidate.canonical_name,
            lat=candidate.latitude,
            lon=candidate.longitude,
            phone=candidate.phone,
            website=candidate.website,
            province=candidate.province,
        )

        if matched:
            # Smart Enrichment Merge into Existing Entity
            updated = False

            # Fill missing phone
            if not matched.phone and candidate.phone:
                matched.phone = candidate.phone
                matched.normalized_phone = candidate.normalized_phone
                matched.phone_type = candidate.phone_type
                if matched.normalized_phone:
                    self.phone_index[matched.normalized_phone] = matched
                updated = True

            # Fill missing website
            if not matched.website and candidate.website:
                matched.website = candidate.website
                matched.domain = candidate.domain
                if matched.domain:
                    self.domain_index[matched.domain] = matched
                updated = True

            # Fill missing email
            if not matched.email and candidate.email:
                matched.email = candidate.email
                updated = True

            # Enrich address if candidate address is more detailed
            if len(candidate.formatted_address or "") > len(matched.formatted_address or ""):
                matched.formatted_address = candidate.formatted_address
                updated = True

            # Increment source count and update scores
            matched.source_count += 1
            matched.completeness_score = min(100, matched.completeness_score + 5)
            matched.identity_confidence = min(100, matched.identity_confidence + 2)
            matched.freshness_score = 95
            matched.lead_score = min(100, matched.lead_score + (5 if updated else 2))

            return False, matched
        else:
            # Register brand new unique entity
            self.register_existing_entity(candidate)
            return True, candidate
