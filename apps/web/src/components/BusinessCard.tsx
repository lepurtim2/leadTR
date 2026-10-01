import React from 'react';
import {
  MapPin,
  Phone,
  Globe,
  Star,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  Clock,
  Mail,
  Instagram,
  Linkedin,
  MessageCircle,
  Zap,
} from 'lucide-react';
import type { BusinessDTO } from '@leadtr/types';

interface BusinessCardProps {
  business: BusinessDTO;
  onSelect: (business: BusinessDTO) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({ business, onSelect }) => {
  const primaryLoc = business.locations?.[0];
  const primaryPhone = business.phones?.[0];
  const primaryWeb = business.websites?.[0];
  const leadScore = business.scores?.leadScore ?? 0;

  const rawPhone = primaryPhone?.normalizedPhone || primaryPhone?.originalPhone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const isMobile =
    primaryPhone?.phoneType === 'mobile' ||
    cleanDigits.startsWith('905') ||
    cleanDigits.startsWith('05') ||
    (cleanDigits.length === 10 && cleanDigits.startsWith('5'));

  const waNumber = isMobile
    ? cleanDigits.startsWith('90')
      ? cleanDigits
      : cleanDigits.startsWith('0')
      ? '9' + cleanDigits
      : '90' + cleanDigits
    : null;

  const isHotLead =
    (business.opportunityScore ?? business.scores?.opportunityScore ?? 0) >= 90 ||
    (!primaryWeb && !!rawPhone);

  const scoreColor =
    leadScore >= 80 ? 'text-positive' :
    leadScore >= 60 ? 'text-accent' :
    leadScore >= 40 ? 'text-warning' :
    'text-muted';

  return (
    <div
      onClick={() => onSelect(business)}
      className="bg-panel rounded-card p-4 border border-border hover:border-border-hover cursor-pointer flex flex-col justify-between transition-colors group relative"
    >
      <div>
        {/* Top: Category + Score */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-accent-muted text-accent">
              {business.category?.name || 'Genel İşletme'}
            </span>
            {isHotLead && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/15 border border-amber-500/30 text-amber-400"
                title="Web sitesi bulunmuyor fakat telefonu doğrulanmış sıcak satış fırsatı!"
              >
                <Zap className="w-2.5 h-2.5 fill-current" />
                Sıcak Lead
              </span>
            )}
            {business.businessStatus === 'active' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-positive">
                <CheckCircle className="w-2.5 h-2.5" />
                Aktif
              </span>
            )}
          </div>

          <div className={`flex items-center gap-1 text-[13px] font-semibold ${scoreColor}`}>
            <Star className="w-3 h-3" />
            <span>{Math.round(leadScore)}</span>
          </div>
        </div>

        {/* Business Name */}
        <h3 className="text-[14px] font-semibold text-foreground line-clamp-1 mb-1.5">
          {business.canonicalName}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-small text-muted mb-3 line-clamp-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>
            {primaryLoc?.district ? `${primaryLoc.district}, ` : ''}
            {primaryLoc?.province || 'Türkiye'}
          </span>
          {primaryLoc?.neighborhood && (
            <span className="text-[10px] text-muted/60">({primaryLoc.neighborhood})</span>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1 text-small text-muted pt-2.5 border-t border-border">
          {primaryPhone ? (
            <div className="flex items-center justify-between gap-1 text-foreground">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-3 h-3 text-positive shrink-0" />
                <span className="font-mono text-[11px] truncate">
                  {primaryPhone.normalizedPhone || primaryPhone.originalPhone}
                </span>
                {isMobile && (
                  <span className="text-[9px] px-1 bg-panel border border-border text-muted rounded">
                    Mobil
                  </span>
                )}
              </div>

              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                    `Merhaba ${business.canonicalName}, LeadTR üzerinden firmanıza ulaştım.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-medium transition-colors shrink-0"
                  title="WhatsApp ile Hızlı Mesaj Gönder"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  <span>WP</span>
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted/50 text-[11px]">
              <Phone className="w-3 h-3 shrink-0" />
              <span>Telefon doğrulanmamış</span>
            </div>
          )}

          {primaryWeb ? (
            <div className="flex items-center gap-2 text-accent text-[11px] truncate">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{primaryWeb.domain || primaryWeb.originalUrl}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted/50 text-[11px]">
              <Globe className="w-3 h-3 shrink-0" />
              <span>Web sitesi yok</span>
            </div>
          )}

          {business.emails && business.emails.length > 0 && (
            <div className="flex items-center gap-2 text-foreground text-[11px] truncate">
              <Mail className="w-3 h-3 shrink-0" />
              <span className="truncate">{business.emails[0].email}</span>
            </div>
          )}

          {business.socials && business.socials.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              {business.socials.map((s, idx) => {
                const isIg = s.platform === 'instagram';
                const isLi = s.platform === 'linkedin';
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                      isIg
                        ? 'bg-pink-500/8 border-pink-500/20 text-pink-400'
                        : isLi
                        ? 'bg-blue-500/8 border-blue-500/20 text-blue-400'
                        : 'bg-panel border-border text-muted'
                    }`}
                  >
                    {isIg && <Instagram className="w-2.5 h-2.5" />}
                    {isLi && <Linkedin className="w-2.5 h-2.5" />}
                    <span className="capitalize">{s.platform}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-border text-[11px] text-muted">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(business.updatedAt).toLocaleDateString('tr-TR')}</span>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${business.canonicalName} ${primaryLoc?.district ? primaryLoc.district + ' ' : ''}${primaryLoc?.province || ''}`.trim()
            )}${primaryLoc?.latitude && primaryLoc?.longitude ? `&center=${primaryLoc.latitude},${primaryLoc.longitude}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover transition-colors"
            title="Google Haritalar'da Aç"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>Harita</span>
          </a>
        </div>

        <button className="flex items-center gap-0.5 text-accent font-medium">
          <span>İncele</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
