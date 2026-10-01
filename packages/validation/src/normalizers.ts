/**
 * LeadTR Data Pipeline Normalizers
 * Preserves original source provenance while generating deterministic normalized forms.
 */

/**
 * Turkish specific character mapping to ASCII lowercase.
 * Properly handles Turkish dotted/dotless I rules.
 */
export function normalizeTurkishText(text: string): string {
  if (!text) return '';

  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize business name for deduplication and fuzzy matching.
 * Strips common Turkish company suffix types while keeping the core identity.
 */
export function normalizeBusinessName(name: string): string {
  let normalized = normalizeTurkishText(name);

  // Common Turkish legal entity types to remove in normalized matching form
  const legalSuffixes = [
    /\blimited\s+sirketi\b/g,
    /\bltd\s+sti\b/g,
    /\bltd\b/g,
    /\banonim\s+sirketi\b/g,
    /\ba\s+s\b/g,
    /\bas\b/g,
    /\bticaret\s+ve\s+sanayi\b/g,
    /\btic\s+san\b/g,
    /\bticaret\b/g,
    /\bsanayi\b/g,
    /\binsaat\b/g,
  ];

  for (const suffix of legalSuffixes) {
    normalized = normalized.replace(suffix, ' ');
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

export interface NormalizedPhoneResult {
  raw: string;
  normalized: string | null;
  isValid: boolean;
  phoneType: 'mobile' | 'landline' | 'toll_free' | 'unknown';
}

/**
 * Turkish Phone Number Normalizer (E.164: +90XXXXXXXXXX)
 * Accepts formats:
 * - 0532 123 45 67
 * - +90 532 123 4567
 * - 5321234567
 * - 0212 444 04 44
 */
export function normalizeTurkishPhone(phone: string): NormalizedPhoneResult {
  if (!phone) {
    return { raw: phone, normalized: null, isValid: false, phoneType: 'unknown' };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Strip international TR prefix 90 if present
  if (cleaned.startsWith('90')) {
    cleaned = cleaned.substring(2);
  }

  // Strip leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // A valid Turkish phone number without 0/90 prefix is exactly 10 digits
  if (cleaned.length !== 10) {
    return { raw: phone, normalized: null, isValid: false, phoneType: 'unknown' };
  }

  let phoneType: NormalizedPhoneResult['phoneType'] = 'unknown';

  if (cleaned.startsWith('5')) {
    phoneType = 'mobile';
  } else if (cleaned.startsWith('850') || cleaned.startsWith('800') || cleaned.startsWith('444')) {
    phoneType = 'toll_free';
  } else if (['2', '3', '4'].includes(cleaned.charAt(0))) {
    phoneType = 'landline';
  }

  const normalized = `+90${cleaned}`;
  return {
    raw: phone,
    normalized,
    isValid: true,
    phoneType,
  };
}

export interface NormalizedUrlResult {
  raw: string;
  normalized: string | null;
  domain: string | null;
  isValid: boolean;
}

/**
 * Normalize website URLs:
 * - ensures valid protocol
 * - lowercases domain
 * - strips tracking parameters (utm_*, ref, etc.)
 * - removes trailing slashes
 */
export function normalizeWebsiteUrl(url: string): NormalizedUrlResult {
  if (!url) {
    return { raw: url, normalized: null, domain: null, isValid: false };
  }

  let cleaned = url.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');

    // Strip tracking queries
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid'];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;
    if (normalized.endsWith('/') && parsed.pathname === '/') {
      normalized = normalized.slice(0, -1);
    }
    if (parsed.search) {
      normalized += parsed.search;
    }

    return {
      raw: url,
      normalized,
      domain,
      isValid: true,
    };
  } catch {
    return { raw: url, normalized: null, domain: null, isValid: false };
  }
}
