"""
LeadTR Python ETL Normalizers
Provides identical normalization logic in Python for DuckDB/Polars batch processing.
"""
import re
from typing import Optional, Tuple


def normalize_turkish_text(text: Optional[str]) -> str:
    """Normalize Turkish characters to lowercase ASCII equivalents."""
    if not text:
        return ""

    mapping = {
        'İ': 'i',
        'I': 'ı',
        'ç': 'c',
        'Ç': 'c',
        'ğ': 'g',
        'Ğ': 'g',
        'ı': 'i',
        'ö': 'o',
        'Ö': 'o',
        'ş': 's',
        'Ş': 's',
        'ü': 'u',
        'Ü': 'u',
    }
    res = text
    for tr, asc in mapping.items():
        res = res.replace(tr, asc)

    res = res.lower()
    res = re.sub(r'[^a-z0-9\s]', ' ', res)
    res = re.sub(r'\s+', ' ', res)
    return res.strip()


def normalize_business_name(name: Optional[str]) -> str:
    """Strip common Turkish company suffixes for deduplication matching."""
    norm = normalize_turkish_text(name)
    suffixes = [
        r'\blimited\s+sirketi\b',
        r'\bltd\s+sti\b',
        r'\bltd\b',
        r'\banonim\s+sirketi\b',
        r'\ba\s+s\b',
        r'\bas\b',
        r'\bticaret\s+ve\s+sanayi\b',
        r'\btic\s+san\b',
        r'\bticaret\b',
        r'\bsanayi\b',
        r'\binsaat\b',
    ]
    for s in suffixes:
        norm = re.sub(s, ' ', norm)
    return re.sub(r'\s+', ' ', norm).strip()


def normalize_turkish_phone(phone: Optional[str]) -> Tuple[Optional[str], str]:
    """
    Normalizes Turkish phone numbers to E.164 format (+90XXXXXXXXXX).
    Returns (normalized_phone, phone_type).
    """
    if not phone:
        return None, "unknown"

    cleaned = re.sub(r'[^\d+]', '', phone)
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    if cleaned.startswith('90'):
        cleaned = cleaned[2:]
    if cleaned.startswith('0'):
        cleaned = cleaned[1:]

    if len(cleaned) != 10:
        return None, "unknown"

    phone_type = "unknown"
    if cleaned.startswith('5'):
        phone_type = "mobile"
    elif cleaned.startswith(('850', '800', '444')):
        phone_type = "toll_free"
    elif cleaned[0] in ('2', '3', '4'):
        phone_type = "landline"

    return f"+90{cleaned}", phone_type
