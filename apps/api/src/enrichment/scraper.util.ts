/**
 * LeadTR — High-Performance Web & Social Media Intelligence Scraper
 * Resilient, fast crawler with timeouts, header spoofing, contact page discovery,
 * email sanitization, and social media profile extraction.
 */

export interface ScrapedSocial {
  platform: 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'x' | 'tiktok';
  url: string;
  handle?: string;
}

export interface ScrapedContactData {
  emails: string[];
  phones: string[];
  socials: ScrapedSocial[];
  title?: string;
  metaDescription?: string;
  httpStatus?: number;
  scrapedAt: string;
  pagesScraped: string[];
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

const BLACKLISTED_EMAIL_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'css', 'js', 'woff', 'woff2', 'ttf', 'eot', 'mp4', 'pdf',
];

const JUNK_EMAILS = [
  'example@example.com',
  'name@example.com',
  'email@domain.com',
  'user@domain.com',
  'sample@sample.com',
  'test@test.com',
  'domain@domain.com',
  'sentry@',
  'noreply@',
  'no-reply@',
];

export async function fetchHtmlWithTimeout(url: string, timeoutMs: number = 6000): Promise<{ html: string; status: number; finalUrl: string } | null> {
  let normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
    });

    clearTimeout(id);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    const html = await res.text();
    return {
      html,
      status: res.status,
      finalUrl: res.url || normalizedUrl,
    };
  } catch {
    clearTimeout(id);
    // If https fails, try http fallback once
    if (normalizedUrl.startsWith('https://')) {
      try {
        const httpUrl = normalizedUrl.replace(/^https:\/\//i, 'http://');
        const httpController = new AbortController();
        const httpId = setTimeout(() => httpController.abort(), 4000);
        const res = await fetch(httpUrl, {
          signal: httpController.signal,
          headers: { 'User-Agent': USER_AGENT },
          redirect: 'follow',
        });
        clearTimeout(httpId);
        const html = await res.text();
        return { html, status: res.status, finalUrl: res.url || httpUrl };
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function extractEmailsFromHtml(html: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const matches = html.match(emailRegex) || [];
  const validEmails = new Set<string>();

  for (const m of matches) {
    const email = m.toLowerCase().trim();
    const parts = email.split('@');
    if (parts.length !== 2) continue;
    const local = parts[0];
    const domain = parts[1];
    if (!local || !domain) continue;

    // Check extension
    const ext = domain.split('.').pop() || '';
    if (BLACKLISTED_EMAIL_EXTENSIONS.includes(ext.toLowerCase())) continue;

    // Check junk
    if (JUNK_EMAILS.some((j) => email.includes(j))) continue;
    if (local.length > 40 || domain.length > 50) continue;

    validEmails.add(email);
  }

  // Also check mailto: links specifically
  const mailtoRegex = /href=["']mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?:\?[^"']*)?["']/gi;
  let match: RegExpExecArray | null;
  while ((match = mailtoRegex.exec(html)) !== null) {
    const matchedEmail = match[1];
    if (!matchedEmail) continue;
    const email = matchedEmail.toLowerCase().trim();
    const ext = email.split('.').pop() || '';
    if (!BLACKLISTED_EMAIL_EXTENSIONS.includes(ext)) {
      validEmails.add(email);
    }
  }

  return Array.from(validEmails);
}

export function extractPhonesAndWhatsApp(html: string): string[] {
  const phones = new Set<string>();

  // WhatsApp links: wa.me, api.whatsapp.com
  const waRegex = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?(\+?[0-9]{10,15})/gi;
  let match: RegExpExecArray | null;
  while ((match = waRegex.exec(html)) !== null) {
    const captured = match[1];
    if (!captured) continue;
    let num = captured.replace(/[^0-9]/g, '');
    if (num.length >= 10) {
      if (num.startsWith('90') && num.length === 12) num = '+' + num;
      else if (num.startsWith('0') && num.length === 11) num = '+9' + num;
      phones.add(num);
    }
  }

  // Turkish phone href links: tel:+90...
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  while ((match = telRegex.exec(html)) !== null) {
    const raw = match[1];
    if (!raw) continue;
    const cleaned = raw.trim().replace(/[^0-9+]/g, '');
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      phones.add(cleaned);
    }
  }

  return Array.from(phones);
}

export function extractSocialsFromHtml(html: string): ScrapedSocial[] {
  const socialsMap = new Map<string, ScrapedSocial>();

  // Link regex to extract href attributes
  const hrefRegex = /href=["'](https?:\/\/[^"'\s>]+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefRegex.exec(html)) !== null) {
    const matchedUrl = match[1];
    if (!matchedUrl) continue;
    const rawUrl = matchedUrl.trim();
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname;

      // 1. Instagram
      if (host.includes('instagram.com')) {
        const parts = path.split('/').filter(Boolean);
        const handle = parts[0];
        if (handle && !['p', 'reel', 'stories', 'explore', 'accounts', 'developer', 'about', 'legal'].includes(handle.toLowerCase())) {
          const cleanUrl = `https://www.instagram.com/${handle}/`;
          socialsMap.set('instagram', { platform: 'instagram', url: cleanUrl, handle });
        }
      }

      // 2. Facebook
      else if (host.includes('facebook.com') && !host.includes('sharer')) {
        const parts = path.split('/').filter(Boolean);
        const handle = parts[0];
        if (handle && !['sharer', 'share', 'dialog', 'tr', 'plugins', 'policies', 'help'].includes(handle.toLowerCase())) {
          const cleanUrl = `https://www.facebook.com/${handle}`;
          socialsMap.set('facebook', { platform: 'facebook', url: cleanUrl, handle });
        }
      }

      // 3. LinkedIn
      else if (host.includes('linkedin.com')) {
        if (path.includes('/company/') || path.includes('/in/')) {
          const parts = path.split('/').filter(Boolean);
          const handle = parts[1] || parts[0];
          if (handle && !['shareArticle', 'sharing'].includes(handle)) {
            const cleanUrl = `https://www.linkedin.com/${parts.slice(0, 2).join('/')}`;
            socialsMap.set('linkedin', { platform: 'linkedin', url: cleanUrl, handle });
          }
        }
      }

      // 4. YouTube
      else if (host.includes('youtube.com') || host.includes('youtu.be')) {
        if (path.startsWith('/@') || path.startsWith('/c/') || path.startsWith('/channel/')) {
          const parts = path.split('/').filter(Boolean);
          const firstPart = parts[0];
          if (firstPart) {
            const handle = firstPart.replace(/^@/, '');
            const cleanUrl = `https://www.youtube.com/${firstPart}`;
            socialsMap.set('youtube', { platform: 'youtube', url: cleanUrl, handle });
          }
        }
      }

      // 5. X / Twitter
      else if (host.includes('twitter.com') || host.includes('x.com')) {
        const parts = path.split('/').filter(Boolean);
        const handle = parts[0];
        if (handle && !['intent', 'share', 'home', 'explore', 'i', 'tos', 'privacy'].includes(handle.toLowerCase())) {
          const cleanUrl = `https://x.com/${handle}`;
          socialsMap.set('x', { platform: 'x', url: cleanUrl, handle });
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return Array.from(socialsMap.values());
}

export function extractPageMetadata(html: string): { title?: string; metaDescription?: string } {
  let title: string | undefined;
  let metaDescription: string | undefined;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch && descMatch[1]) {
    metaDescription = descMatch[1].trim();
  }

  return { title, metaDescription };
}

export function findContactSubpages(html: string, baseUrl: string): string[] {
  const contactKeywords = [
    'iletisim',
    'contact',
    'bize-ulasin',
    'ulasim',
    'hakkimizda',
    'about',
    'about-us',
    'subeler',
    'klinigimiz',
  ];

  const subpages = new Set<string>();
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  try {
    const base = new URL(baseUrl);
    while ((match = linkRegex.exec(html)) !== null) {
      const rawHref = match[1];
      if (!rawHref) continue;
      const href = rawHref.trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      const lower = href.toLowerCase();
      if (contactKeywords.some((kw) => lower.includes(kw))) {
        try {
          const resolved = new URL(href, baseUrl);
          // Only same domain subpages
          if (resolved.hostname === base.hostname) {
            subpages.add(resolved.toString());
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(subpages).slice(0, 2);
}

/**
 * Scrapes a website (homepage + contact subpage if needed) for emails, socials, phones and metadata.
 */
export async function scrapeBusinessWebsite(websiteUrl: string): Promise<ScrapedContactData> {
  const result: ScrapedContactData = {
    emails: [],
    phones: [],
    socials: [],
    scrapedAt: new Date().toISOString(),
    pagesScraped: [],
  };

  const home = await fetchHtmlWithTimeout(websiteUrl, 6000);
  if (!home) {
    return result;
  }

  result.httpStatus = home.status;
  result.pagesScraped.push(home.finalUrl);

  const meta = extractPageMetadata(home.html);
  result.title = meta.title;
  result.metaDescription = meta.metaDescription;

  const emailsSet = new Set(extractEmailsFromHtml(home.html));
  const phonesSet = new Set(extractPhonesAndWhatsApp(home.html));
  const socialsMap = new Map<string, ScrapedSocial>();
  for (const s of extractSocialsFromHtml(home.html)) {
    socialsMap.set(s.platform, s);
  }

  // Find contact page for deeper inspection if emails or socials are scarce
  if (emailsSet.size === 0 || socialsMap.size === 0) {
    const contactLinks = findContactSubpages(home.html, home.finalUrl);
    for (const subLink of contactLinks) {
      try {
        const subPage = await fetchHtmlWithTimeout(subLink, 4000);
        if (subPage) {
          result.pagesScraped.push(subPage.finalUrl);
          extractEmailsFromHtml(subPage.html).forEach((e) => emailsSet.add(e));
          extractPhonesAndWhatsApp(subPage.html).forEach((p) => phonesSet.add(p));
          extractSocialsFromHtml(subPage.html).forEach((s) => socialsMap.set(s.platform, s));
        }
      } catch {
        // continue
      }
    }
  }

  result.emails = Array.from(emailsSet);
  result.phones = Array.from(phonesSet);
  result.socials = Array.from(socialsMap.values());

  return result;
}
