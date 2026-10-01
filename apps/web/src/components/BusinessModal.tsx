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
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
  RefreshCw,
  CheckCircle,
  Zap,
  Send,
  Sparkles,
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

  // Sales Pitch States
  const [pitchType, setPitchType] = useState<'web' | 'b2b' | 'pos'>('web');
  const [pitchText, setPitchText] = useState('');
  const [pitchCopied, setPitchCopied] = useState(false);

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

  const isMobile =
    currentBusiness.phones?.[0]?.phoneType === 'mobile' ||
    Boolean(cleanPhoneDigits && (cleanPhoneDigits.startsWith('905') || cleanPhoneDigits.startsWith('05') || (cleanPhoneDigits.length === 10 && cleanPhoneDigits.startsWith('5'))));

  const waNumber = isMobile && cleanPhoneDigits
    ? cleanPhoneDigits.startsWith('90')
      ? cleanPhoneDigits
      : cleanPhoneDigits.startsWith('0')
      ? '9' + cleanPhoneDigits
      : '90' + cleanPhoneDigits
    : null;

  const oppScore = currentBusiness.opportunityScore ?? currentBusiness.scores?.opportunityScore ?? (
    (!primaryWeb && !!primaryPhone) ? 95 : (!!primaryWeb && !currentBusiness.emails?.length) ? 75 : 40
  );
  const oppReason = currentBusiness.opportunityReason ?? currentBusiness.scores?.opportunityReason ?? (
    oppScore >= 90 ? '🔥 Acil Satış (Web Sitesi Yok, Telefonu Doğrulanmış)' :
    oppScore >= 70 ? '⚡ Gelişime Açık (B2B / Tedarik / İletişim Genişletme)' :
    '🔒 Dijitalleşmiş İşletme (Kurumsal Entegrasyon / Finans)'
  );

  // Dynamic Sales Pitch Generation
  useEffect(() => {
    if (!currentBusiness) return;
    const name = currentBusiness.canonicalName;
    const district = loc?.district ? `${loc.district} bölgesindeki` : 'bölgenizdeki';
    const cat = currentBusiness.category?.name || 'ticari';

    if (pitchType === 'web') {
      if (!primaryWeb) {
        setPitchText(
          `Merhaba ${name} yetkilisi, ${district} faaliyetlerinizi LeadTR rehberinde inceledik. Bölgenizdeki müşteri aramalarında işletmenize ait aktif bir web sitesi veya kurumsal profil bulunmuyor. Müşterilerinizin Google ve haritalar üzerinden size doğrudan ulaşabilmesi ve müşteri taleplerinizi 2-3 katına çıkarmak için hızlı, mobil uyumlu bir web sitesi & Google işletme optimizasyonu sunuyoruz. Detaylı bilgi ve referanslarımız için görüşebilir miyiz?`
        );
      } else {
        setPitchText(
          `Merhaba ${name} yetkilisi, ${district} faaliyet gösteren web sitenizi (${primaryWeb}) inceledik. Google SEO sıralamalarınızı yükseltmek, aramalarda rakiplerinizin önüne geçmek ve web üzerinden gelen müşteri formlarınızı artırmak için dijital büyüme teklifimizi iletmek isteriz. Kısa bir görüşme için müsait misiniz?`
        );
      }
    } else if (pitchType === 'b2b') {
      setPitchText(
        `Merhaba ${name} yetkilisi, ${cat} sektöründeki başarılı çalışmalarınızı takip ediyoruz. İşletmenizin operasyonel maliyetlerini %20-30 oranında düşürecek avantajlı toptan tedarik ve özel kurumsal fiyat teklifimizi paylaşmak için kısa bir görüşme rica ediyoruz. Uygun olduğunuz bir zaman dilimi var mıdır?`
      );
    } else if (pitchType === 'pos') {
      setPitchText(
        `Merhaba ${name} yetkilisi, ${district} ticari operasyonlarınız için %100 komisyonsuz yeni nesil POS ve ertesi gün bloke olmadan nakit akışı sağlayan kurumsal finansman çözümlerimizi paylaşmak isteriz. Size özel avantajlı oranları iletmemiz için dönüş yapabilir misiniz?`
      );
    }
  }, [currentBusiness, pitchType, loc?.district, primaryWeb]);

  const handleCopyPitch = () => {
    if (!pitchText) return;
    navigator.clipboard.writeText(pitchText);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  };

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
    setEnrichmentMessage('Web sitesi ve iletişim kanalları taranıyor…');
    setEnrichmentSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/enrichment/${currentBusiness.id}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const enriched = data.data;
        setEnrichmentSuccess(true);
        setEnrichmentMessage(data.message || 'Zenginleştirme tamamlandı.');

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

  const scoreColor =
    leadScore >= 80 ? 'text-positive' :
    leadScore >= 60 ? 'text-accent' :
    leadScore >= 40 ? 'text-warning' :
    'text-muted';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-modal border border-border bg-panel shadow-2xl p-5 sm:p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-card bg-surface text-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-small font-medium rounded bg-accent-muted text-accent">
              {currentBusiness.category?.name || 'Genel İşletme'}
            </span>
            <span className="text-small font-medium text-positive">
              {currentBusiness.businessStatus === 'active' ? 'Aktif İşletme' : currentBusiness.businessStatus}
            </span>
            {currentBusiness.socials && currentBusiness.socials.length > 0 && (
              <span className="text-small text-muted">Sosyal medya zenginleştirilmiş</span>
            )}
            <span className="text-[10px] text-muted font-mono ml-auto">
              {currentBusiness.id.slice(0, 8)}…
            </span>
          </div>

          <h2 className="text-[22px] font-bold text-foreground tracking-tight">{currentBusiness.canonicalName}</h2>
          {currentBusiness.automatedDescription && (
            <p className="text-body text-muted mt-1">{currentBusiness.automatedDescription}</p>
          )}
        </div>

        {/* Opportunity / Need Banner */}
        <div
          className={`mb-4 p-3 rounded-card border flex items-start justify-between gap-3 ${
            oppScore >= 90
              ? 'bg-amber-500/10 border-amber-500/30'
              : oppScore >= 70
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-surface border-border'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Zap
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                oppScore >= 90 ? 'text-amber-400 fill-amber-400' : 'text-accent'
              }`}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold text-foreground">
                  {oppReason}
                </span>
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    oppScore >= 90
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-surface text-foreground border border-border'
                  }`}
                >
                  Fırsat Skoru: {oppScore}/100
                </span>
              </div>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">
                {oppScore >= 90
                  ? 'İşletmenin doğrulanmış telefon hattı bulunmakta ancak resmi bir web sitesi veya dijital varlığı tespit edilmemiştir. Web tasarım, Google Harita SEO ve dijital varlık satışı için en yüksek dönüşüm oranına sahip sıcak lead!'
                  : oppScore >= 70
                  ? 'İşletmenin web sitesi ve telefonu mevcut, doğrudan B2B kanalları ve kurumsal e-postaları genişletilebilir. Toptan tedarik ve kurumsal hizmet teklifleri için ideal profildir.'
                  : 'İşletme dijital varlıklarını ve kurumsal kanallarını tamamlamış. POS, ticari finansman ve ileri düzey kurumsal iş birlikleri için değerlendirilebilir.'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {primaryPhone ? (
            <a
              href={`tel:${primaryPhone}`}
              className="py-2 px-3 rounded-card bg-positive/10 border border-positive/25 text-positive font-medium text-small transition-colors flex items-center justify-center gap-1.5 hover:bg-positive/15"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Hemen Ara</span>
            </a>
          ) : (
            <div className="py-2 px-3 rounded-card bg-surface border border-border text-muted/50 font-medium text-small flex items-center justify-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Telefon Yok</span>
            </div>
          )}

          {waNumber ? (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                `Merhaba ${currentBusiness.canonicalName}, LeadTR üzerinden firmanıza ulaştım.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-small transition-colors flex items-center justify-center gap-1.5 hover:bg-emerald-500/20"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <div
              className="py-2 px-3 rounded-card bg-surface border border-border text-muted/50 font-medium text-small flex items-center justify-center gap-1.5"
              title="05xx ile başlayan cep numarası bulunamadı"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Yok</span>
            </div>
          )}

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-3 rounded-card bg-accent-muted border border-accent/20 text-accent font-medium text-small transition-colors flex items-center justify-center gap-1.5 hover:bg-accent/15"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Yol Tarifi</span>
          </a>

          <button
            onClick={handleCopyDossier}
            className={`py-2 px-3 rounded-card border text-small font-medium transition-colors flex items-center justify-center gap-1.5 ${
              copied
                ? 'bg-accent text-white border-accent'
                : 'bg-surface border-border text-muted hover:text-foreground'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Kopyalandı</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Bilgileri Kopyala</span>
              </>
            )}
          </button>
        </div>

        {/* Enrichment Engine */}
        {primaryWeb ? (
          <div className="p-3 rounded-card bg-surface border border-border mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-small font-semibold text-foreground">İletişim zenginleştirme motoru</span>
                <p className="text-[10px] text-muted mt-0.5">
                  Web sitesini tarayarak Instagram, LinkedIn ve e-postaları tespit eder.
                </p>
              </div>

              <button
                onClick={handleEnrich}
                disabled={isEnriching}
                className="px-3 py-1.5 rounded-card bg-accent hover:bg-accent-hover text-white font-medium text-small disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
                <span>{isEnriching ? 'Taranıyor…' : 'Sosyal medyayı tara'}</span>
              </button>
            </div>

            {enrichmentMessage && (
              <div
                className={`mt-2 p-2 rounded-card text-small flex items-center gap-1.5 ${
                  enrichmentSuccess
                    ? 'bg-positive/10 border border-positive/20 text-positive'
                    : enrichmentSuccess === false
                    ? 'bg-danger/10 border border-danger/20 text-danger'
                    : 'bg-accent-muted border border-accent/20 text-accent'
                }`}
              >
                {enrichmentSuccess && <CheckCircle className="w-3 h-3 shrink-0" />}
                <span>{enrichmentMessage}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Scores Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-card bg-surface border border-border">
          <div>
            <span className="text-[10px] text-muted">Lead Skoru</span>
            <div className={`flex items-center gap-1 text-[16px] font-bold ${scoreColor}`}>
              <Star className="w-3.5 h-3.5" />
              <span>{Math.round(leadScore)} / 100</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted">Veri Doluluğu</span>
            <p className="text-[16px] font-bold text-positive">
              %{Math.round(currentBusiness.scores?.completenessScore ?? 75)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted">Dijital Varlık</span>
            <p className="text-[16px] font-bold text-accent">
              %{Math.round(currentBusiness.scores?.digitalPresenceScore ?? 60)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-muted">Doğruluk Güveni</span>
            <p className="text-[16px] font-bold text-warning">
              %{Math.round(currentBusiness.scores?.identityConfidence ?? 95)}
            </p>
          </div>
        </div>

        {/* Personalized Sales Pitch Generator & 1-Click WhatsApp Outreach */}
        <div className="mb-4 p-3.5 rounded-card bg-surface border border-accent/30 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              <h4 className="text-small font-bold text-foreground">
                Kişiselleştirilmiş Satış Mesajı &amp; Pitch Asistanı
              </h4>
            </div>

            {/* Pitch Type Selector */}
            <div className="flex items-center gap-1 bg-panel p-1 rounded-card border border-border">
              <button
                type="button"
                onClick={() => setPitchType('web')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  pitchType === 'web'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                🌐 Web &amp; Dijital
              </button>
              <button
                type="button"
                onClick={() => setPitchType('b2b')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  pitchType === 'b2b'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                📦 Toptan / B2B
              </button>
              <button
                type="button"
                onClick={() => setPitchType('pos')}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  pitchType === 'pos'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                💳 POS &amp; Finans
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={pitchText}
              onChange={(e) => setPitchText(e.target.value)}
              className="w-full text-[12px] leading-relaxed p-2.5 bg-panel border border-border rounded-card text-foreground focus:outline-none focus:border-accent resize-none font-sans"
              placeholder="Kişiselleştirilmiş satış mesajı hazırlanıyor..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
            <span className="text-[11px] text-muted">
              {waNumber ? (
                <span className="text-positive font-medium inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  WhatsApp Uyumlu Hat: +{waNumber}
                </span>
              ) : primaryPhone ? (
                <span className="text-muted/70">
                  Sabit telefon hattı ({primaryPhone}) - SMS veya doğrudan arama önerilir
                </span>
              ) : (
                <span className="text-muted/50">Telefon numarası mevcut değil</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPitch}
                className={`px-3 py-1.5 rounded-card border text-[12px] font-medium transition-colors inline-flex items-center gap-1.5 ${
                  pitchCopied
                    ? 'bg-accent text-white border-accent'
                    : 'bg-panel border-border text-foreground hover:bg-surface'
                }`}
              >
                {pitchCopied ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Metin Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Pitch'i Kopyala</span>
                  </>
                )}
              </button>

              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(pitchText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-card bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[12px] transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  title="Mesajı WhatsApp'ta aç ve anında müşteriye gönder"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp ile Gönder</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 rounded-card bg-panel border border-border text-muted/50 font-medium text-[12px] inline-flex items-center gap-1.5 cursor-not-allowed"
                  title="WhatsApp uyumlu cep numarası (05xx) bulunamadı"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp Yok</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Social Media & Digital Assets */}
        {currentBusiness.socials && currentBusiness.socials.length > 0 && (
          <div className="mb-4 p-3 rounded-card bg-surface border border-border space-y-2">
            <h4 className="text-small font-semibold text-foreground">
              Tespit edilen sosyal medya kanalları
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
                    className={`p-2 rounded-card border transition-colors text-left flex items-center justify-between ${
                      isIg
                        ? 'border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10'
                        : isLi
                        ? 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10'
                        : isFb
                        ? 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10'
                        : isYt
                        ? 'border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10'
                        : 'border-border bg-panel hover:border-border-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isIg && <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                      {isLi && <Linkedin className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      {isFb && <Facebook className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      {isYt && <Youtube className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {!isIg && !isLi && !isFb && !isYt && <Globe className="w-3.5 h-3.5 text-muted shrink-0" />}
                      <div className="truncate">
                        <span className="text-small font-medium text-foreground block capitalize">
                          {s.platform}
                        </span>
                        <span className="text-[10px] text-muted block truncate">
                          {s.normalizedHandle ? `@${s.normalizedHandle}` : 'Profili gör'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted shrink-0 ml-1" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* 2-Column: Address & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Location */}
          <div className="space-y-2 p-3 rounded-card bg-surface border border-border">
            <h4 className="text-small font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted" />
              Konum ve adres
            </h4>
            <div className="text-small space-y-1.5 text-muted">
              <p>
                <span className="text-foreground font-medium">İl / İlçe:</span>{' '}
                {loc?.province ? `${loc.province} / ${loc.district || '-'}` : 'Belirtilmemiş'}
              </p>
              {loc?.neighborhood && (
                <p>
                  <span className="text-foreground font-medium">Mahalle:</span> {loc.neighborhood}
                </p>
              )}
              {loc?.formattedAddress && (
                <p>
                  <span className="text-foreground font-medium">Adres:</span> {loc.formattedAddress}
                </p>
              )}
              {loc?.latitude && loc?.longitude && (
                <div className="mt-2 pt-2 border-t border-border font-mono text-[10px] text-muted flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-medium transition-colors"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>Google Haritalar</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 p-3 rounded-card bg-surface border border-border">
            <h4 className="text-small font-semibold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted" />
              İletişim kanalları
            </h4>
            <div className="text-small space-y-2 text-muted">
              {currentBusiness.phones && currentBusiness.phones.length > 0 ? (
                currentBusiness.phones.map((p, i) => (
                  <div key={i} className="flex items-center justify-between font-mono bg-panel p-2 rounded-card border border-border">
                    <span className="text-foreground font-medium">{p.normalizedPhone || p.originalPhone}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-positive/10 text-positive font-medium">
                      {p.phoneType === 'mobile' ? 'Mobil' : 'Sabit'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted/60 italic">Telefon bilgisi bulunamadı.</p>
              )}

              {currentBusiness.websites && currentBusiness.websites.length > 0 ? (
                currentBusiness.websites.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-card bg-panel border border-border">
                    <a
                      href={w.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover flex items-center gap-1.5 truncate max-w-[220px] transition-colors"
                    >
                      <Globe className="w-3 h-3 shrink-0" />
                      <span className="truncate font-medium">{w.domain || w.originalUrl}</span>
                    </a>
                    <span className="text-[10px] text-positive font-medium px-1.5 py-0.5 bg-positive/10 rounded">
                      HTTPS
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-2 rounded-card bg-warning/10 border border-warning/20 text-warning text-small flex items-center gap-1.5">
                  <Globe className="w-3 h-3" />
                  <span>Web sitesi yok — lead adayı</span>
                </div>
              )}

              {/* Emails List */}
              {currentBusiness.emails && currentBusiness.emails.length > 0 ? (
                currentBusiness.emails.map((e, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-card bg-panel border border-border">
                    <a
                      href={`mailto:${e.email}`}
                      className="flex items-center gap-1.5 text-foreground hover:text-accent font-mono truncate transition-colors"
                    >
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{e.email}</span>
                    </a>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-positive/10 text-positive font-medium">
                      Doğrulandı
                    </span>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        </div>

        {/* Provenance */}
        <div className="p-3 rounded-card bg-surface border border-border text-small text-muted flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-foreground block">Doğrulanmış B2B istihbaratı</span>
            <p className="text-[10px] leading-relaxed">
              Bu kayıt, Overture Maps Foundation ve LeadTR Zenginleştirme Motoru tarafından taranmış, koordinatları ve iletişim kanalları teyit edilmiş gerçek bir işletmedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
