import { describe, it, expect } from 'vitest';
import { normalizeTurkishText, normalizeBusinessName, normalizeTurkishPhone, normalizeWebsiteUrl } from './normalizers.js';

describe('normalizers', () => {
  it('correctly normalizes Turkish characters', () => {
    expect(normalizeTurkishText('İstanbul Şişli Çankaya Örnek')).toBe('istanbul sisli cankaya ornek');
  });

  it('correctly strips corporate suffixes in match name', () => {
    expect(normalizeBusinessName('Acıbadem Sağlık Hizmetleri Ticaret A.Ş.')).toBe('acibadem saglik hizmetleri');
  });

  it('correctly normalizes Turkish phone numbers to E.164', () => {
    const mobile = normalizeTurkishPhone('0532 123 45 67');
    expect(mobile.isValid).toBe(true);
    expect(mobile.normalized).toBe('+905321234567');
    expect(mobile.phoneType).toBe('mobile');

    const landline = normalizeTurkishPhone('+90 (212) 444 0 444');
    expect(landline.isValid).toBe(true);
    expect(landline.normalized).toBe('+902124440444');
    expect(landline.phoneType).toBe('landline');
  });

  it('correctly normalizes website URLs', () => {
    const res = normalizeWebsiteUrl('HTTP://WWW.Acibadem.com.tr/hakkimizda?utm_source=google&ref=test');
    expect(res.isValid).toBe(true);
    expect(res.domain).toBe('acibadem.com.tr');
    expect(res.normalized).toBe('http://www.acibadem.com.tr/hakkimizda');
  });
});
