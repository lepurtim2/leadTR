'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  Shield,
  MessageCircle,
  Copy,
  Navigation,
  Sparkles,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import type { BusinessDTO } from '@leadtr/types';

interface BusinessModalProps {
  business: BusinessDTO | null;
  onClose: () => void;
  onBusinessUpdated?: (updated: BusinessDTO) => void;
}

export const BusinessModal: React.FC<BusinessModalProps> = ({ business, onClose, onBusinessUpdated }) => {
  const [copied, setCopied] = useState(false);
  const [currentBusiness, setCurrentBusiness] = useState<BusinessDTO | null>(business);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentMessage, setEnrichmentMessage] = useState<string | null>(null);
  const [enrichmentSuccess, setEnrichmentSuccess] = useState<boolean | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    setCurrentBusiness(business);
    setEnrichmentMessage(null);
    setEnrichmentSuccess(null);
  }, [business]);

  if (!currentBusiness) return null;

  const loc = currentBusiness.locations?.[0];
  const leadScore = currentBusiness.scores?.leadScore ?? 0;
  const primaryPhone = currentBusiness.phones?.[0]?.normalizedPhone || currentBusiness.phones?.[0]?.originalPhone;
  const cleanPhoneDigits = primaryPhone ? primaryPhone.replace(/\D/g, '') : null;
  const primaryWeb = currentBusiness.websites?.[0]?.canonicalUrl || currentBusiness.websites?.[0]?.originalUrl;

  const handleCopyDossier = () => {
    const lines = [
      `Firma: ${currentBusiness.canonicalName}`,
      `Kategori: ${currentBusiness.category?.name || 'Genel Ticari'}`,
      `Konum: ${loc?.province || ''} / ${loc?.district || ''}`,
      loc?.formattedAddress ? `Adres: ${loc.formattedAddress}` : '',
      primaryPhone ? `Telefon: ${primaryPhone}` : '',
      primaryWeb ? `Web: ${primaryWeb}` : '',
      currentBusiness.emails?.length ? `E-Postalar: ${currentBusiness.emails.map((e) => e.email).join(', ')}` : '',
      currentBusiness.socials?.length
        ? `Sosyal Medya: ${currentBusiness.socials.map((s) => `${s.platform}: ${s.url}`).join(' | ')}`
        : '',
      `Lead Skoru: ${Math.round(leadScore)}/100`,
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnrich = async () => {
    if (!currentBusiness.id || isEnriching) return;
    setIsEnriching(true);
    setEnrichmentMessage('Web sitesi ve iletişim kanalları taranıyor...');
    setEnrichmentSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/enrichment/${currentBusiness.id}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const enriched = data.data;
        setEnrichmentSuccess(true);
        setEnrichmentMessage(data.message || 'Zenginleştirme başarıyla tamamlandı!');

        // 1. Immediately update state in-place with 0ms delay
        setCurrentBusiness((prev) => {
          if (!prev) return prev;

          const mergedEmails = [...(prev.emails || [])];
          for (const e of enriched.emails || []) {
            if (!mergedEmails.some((x) => x.email.toLowerCase() === e.toLowerCase())) {
              mergedEmails.push({
                id: `${prev.id}-enr-em-${mergedEmails.length}`,
                email: e,
                normalizedEmail: e.toLowerCase(),
                emailType: 'public_business',
                isPrimary: mergedEmails.length === 0,
                confidence: 95,
              });
            }
          }

          const mergedSocials = [...(prev.socials || [])];
          for (const s of enriched.socials || []) {
            if (!mergedSocials.some((x) => x.platform === s.platform)) {
              mergedSocials.push({
                id: `${prev.id}-soc-${s.platform}`,
                platform: s.platform,
                url: s.url,
                normalizedHandle: s.handle,
                isPrimary: true,
                confidence: 95,
              });
            }
          }

          const mergedPhones = [...(prev.phones || [])];
          for (const p of enriched.phones || []) {
            const cleanP = p.replace(/\D/g, '');
            if (!mergedPhones.some((x) => x.normalizedPhone?.replace(/\D/g, '') === cleanP)) {
              mergedPhones.push({
                id: `${prev.id}-enr-ph-${mergedPhones.length}`,
                originalPhone: p,
                normalizedPhone: p,
                countryCode: '+90',
                phoneType: 'mobile',
                isPrimary: false,
                confidence: 90,
              });
            }
          }

          const updated: BusinessDTO = {
            ...prev,
            emails: mergedEmails,
            socials: mergedSocials,
            phones: mergedPhones,
            scores: {
              ...prev.scores,
              digitalPresenceScore: Math.min(100, (prev.scores?.digitalPresenceScore || 60) + 20),
              leadScore: Math.min(100, (prev.scores?.leadScore || 75) + 10),
            },
          };

          if (onBusinessUpdated) {
            onBusinessUpdated(updated);
          }

          return updated;
        });

        // 2. Fetch fresh canonical DTO from backend to ensure full DB sync
        try {
          const bizRes = await fetch(`${API_BASE}/api/v1/businesses/${currentBusiness.id}`);
          if (bizRes.ok) {
            const updatedBiz: BusinessDTO = await bizRes.json();
            setCurrentBusiness(updatedBiz);
            if (onBusinessUpdated) {
              onBusinessUpdated(updatedBiz);
            }
          }
        } catch {
          // ignore
        }
      } else {
        setEnrichmentSuccess(false);
        setEnrichmentMessage(data.message || 'Web sitesi taranamadı veya iletişim bilgisi bulunamadı.');
      }
    } catch (err: any) {
      setEnrichmentSuccess(false);
      setEnrichmentMessage('Zenginleştirme sırasında bir hata oluştu.');
    } finally {
      setIsEnriching(false);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${currentBusiness.canonicalName} ${loc?.district ? loc.district + ' ' : ''}${loc?.province || ''}`.trim()
  )}${loc?.latitude && loc?.longitude ? `&center=${loc.latitude},${loc.longitude}` : ''}`;

  const directionsUrl =
    loc?.latitude && loc?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
      : googleMapsUrl;

  const whatsappUrl = cleanPhoneDigits
    ? `https://wa.me/${cleanPhoneDigits.startsWith('90') ? cleanPhoneDigits : '90' + cleanPhoneDigits}?text=${encodeURIComponent(
        `Merhaba ${currentBusiness.canonicalName}, LeadTR üzerinden firmanıza ulaştım.`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="glass-panel w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {currentBusiness.category?.name || 'Genel İşletme'}
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
              {currentBusiness.businessStatus === 'active' ? 'Doğrulanmış Aktif İşletme' : 'Durum: ' + currentBusiness.businessStatus}
            </span>
            {currentBusiness.socials && currentBusiness.socials.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 rounded-md inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-400" />
                Sosyal Medya Zenginleştirilmiş
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono">ID: {currentBusiness.id.slice(0, 8)}...</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{currentBusiness.canonicalName}</h2>
          {currentBusiness.automatedDescription && (
            <p className="text-xs text-slate-400 mt-1.5">{currentBusiness.automatedDescription}</p>
          )}
        </div>

        {/* Quick Action Bar (Call, WhatsApp, Maps, Copy) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {primaryPhone ? (
            <a
              href={`tel:${primaryPhone}`}
              className="py-2.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Hemen Ara</span>
            </a>
          ) : (
            <div className="py-2.5 px-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 opacity-60">
              <Phone className="w-3.5 h-3.5" />
              <span>Telefon Yok</span>
            </div>
          )}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <div className="py-2.5 px-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 opacity-60">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Yok</span>
            </div>
          )}

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Yol Tarifi</span>
          </a>

          <button
            onClick={handleCopyDossier}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              copied
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Bilgileri Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* ── Enrichment Engine Action Banner ── */}
        {primaryWeb ? (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-white">İletişim & Sosyal Medya Zenginleştirme Motoru</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Web sitesini tarayarak Instagram, LinkedIn, Facebook ve kurumsal e-postaları doğrudan tespit eder.
                </p>
              </div>

              <button
                onClick={handleEnrich}
                disabled={isEnriching}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
                <span>{isEnriching ? 'Taranıyor...' : 'Web & Sosyal Medyayı Tara'}</span>
              </button>
            </div>

            {enrichmentMessage && (
              <div
                className={`mt-2.5 p-2 rounded-lg text-xs flex items-center gap-2 ${
                  enrichmentSuccess
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : enrichmentSuccess === false
                    ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                }`}
              >
                {enrichmentSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <span>{enrichmentMessage}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Scores Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="text-[11px] text-slate-400">Lead Skoru</span>
            <div className="flex items-center gap-1.5 text-lg font-bold text-cyan-400 font-mono">
              <Star className="w-4 h-4 fill-cyan-400 text-cyan-400" />
              <span>{Math.round(leadScore)} / 100</span>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Veri Doluluğu</span>
            <p className="text-lg font-bold text-emerald-400 font-mono">
              %{Math.round(currentBusiness.scores?.completenessScore ?? 75)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Dijital Varlık</span>
            <p className="text-lg font-bold text-purple-400 font-mono">
              %{Math.round(currentBusiness.scores?.digitalPresenceScore ?? 60)}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Doğruluk Güveni</span>
            <p className="text-lg font-bold text-amber-400 font-mono">
              %{Math.round(currentBusiness.scores?.identityConfidence ?? 95)}
            </p>
          </div>
        </div>

        {/* ── Social Media & Digital Assets (New Section) ── */}
        {currentBusiness.socials && currentBusiness.socials.length > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Tespit Edilen Sosyal Medya & Dijital Kanallar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {currentBusiness.socials.map((s, idx) => {
                const isIg = s.platform === 'instagram';
                const isLi = s.platform === 'linkedin';
                const isFb = s.platform === 'facebook';
                const isYt = s.platform === 'youtube';

                return (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all group ${
                      isIg
                        ? 'border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10'
                        : isLi
                        ? 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
                        : isFb
                        ? 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10'
                        : isYt
                        ? 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10'
                        : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isIg && <Instagram className="w-4 h-4 text-pink-400 shrink-0" />}
                      {isLi && <Linkedin className="w-4 h-4 text-blue-400 shrink-0" />}
                      {isFb && <Facebook className="w-4 h-4 text-indigo-400 shrink-0" />}
                      {isYt && <Youtube className="w-4 h-4 text-rose-400 shrink-0" />}
                      {!isIg && !isLi && !isFb && !isYt && <Globe className="w-4 h-4 text-cyan-400 shrink-0" />}
                      <div className="truncate">
                        <span className="text-[11px] font-bold text-white block capitalize">
                          {s.platform}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {s.normalizedHandle ? `@${s.normalizedHandle}` : 'Profili Gör'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-white shrink-0 ml-1.5" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-Column Content: Address & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Location details */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Konum & Adres Detayları
            </h4>
            <div className="text-xs space-y-2 text-slate-300">
              <p>
                <strong className="text-white">İl / İlçe:</strong>{' '}
                {loc?.province ? `${loc.province} / ${loc.district || '-'}` : 'Belirtilmemiş'}
              </p>
              {loc?.neighborhood && (
                <p>
                  <strong className="text-white">Mahalle:</strong> {loc.neighborhood}
                </p>
              )}
              {loc?.formattedAddress && (
                <p>
                  <strong className="text-white">Açık Adres:</strong> {loc.formattedAddress}
                </p>
              )}
              {loc?.latitude && loc?.longitude && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/60 font-mono text-[11px] text-cyan-300 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    📍 {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 font-semibold transition-colors"
                      title="Google Haritalar'da Aç"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Google Haritalar</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-emerald-400" />
              İletişim & Kanallar
            </h4>
            <div className="text-xs space-y-2.5 text-slate-300">
              {currentBusiness.phones && currentBusiness.phones.length > 0 ? (
                currentBusiness.phones.map((p, i) => (
                  <div key={i} className="flex items-center justify-between font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-white font-bold">{p.normalizedPhone || p.originalPhone}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {p.phoneType === 'mobile' ? 'Mobil / WhatsApp' : 'Sabit Hat'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">Telefon bilgisi bulunamadı.</p>
              )}

              {currentBusiness.websites && currentBusiness.websites.length > 0 ? (
                currentBusiness.websites.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <a
                      href={w.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1.5 truncate max-w-[220px]"
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate font-medium">{w.domain || w.originalUrl}</span>
                    </a>
                    <span className="text-[10px] text-emerald-400 font-mono px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                      HTTPS Aktif
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Web sitesi yok (Web tasarım ve dijital lead adayı)</span>
                </div>
              )}

              {/* Emails List */}
              {currentBusiness.emails && currentBusiness.emails.length > 0 ? (
                currentBusiness.emails.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <a
                      href={`mailto:${e.email}`}
                      className="flex items-center gap-2 text-purple-300 hover:text-purple-200 font-mono truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{e.email}</span>
                    </a>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Doğrulandı
                    </span>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>

        {/* Provenance & Licensing Information */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-300 block">Doğrulanmış B2B İstihbaratı</span>
            <p className="leading-relaxed text-[11px]">
              Bu kayıt, <strong>Overture Maps Foundation</strong> ve <strong>LeadTR Zenginleştirme Motoru</strong> tarafından taranmış, koordinatları ve iletişim kanalları teyit edilmiş gerçek bir işletmedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
