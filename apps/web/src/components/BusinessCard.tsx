import React from 'react';
import {
  MapPin,
  Phone,
  Globe,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Mail,
  Instagram,
  Linkedin,
  Sparkles,
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

  const scoreColor =
    leadScore >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    leadScore >= 60 ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' :
    leadScore >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
    'text-slate-400 bg-slate-800 border-slate-700';

  return (
    <div
      onClick={() => onSelect(business)}
      className="glass-panel glass-panel-hover rounded-xl p-5 border border-slate-800/80 bg-slate-900/50 cursor-pointer flex flex-col justify-between group transition-all"
    >
      <div>
        {/* Top bar: Category + Lead Score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-brand-500/10 text-cyan-300 border border-brand-500/20">
              {business.category?.name || 'Genel İşletme'}
            </span>
            {business.businessStatus === 'active' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20">
                <CheckCircle className="w-2.5 h-2.5" />
                Aktif
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${scoreColor}`}
            title="LeadTR Skorlama Algoritması (0-100)"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>{Math.round(leadScore)}</span>
          </div>
        </div>

        {/* Business Title */}
        <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-2">
          {business.canonicalName}
        </h3>

        {/* Location snippet */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-3 line-clamp-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {primaryLoc?.district ? `${primaryLoc.district}, ` : ''}
            {primaryLoc?.province || 'Türkiye'}
          </span>
          {primaryLoc?.neighborhood && (
            <span className="text-slate-500 text-[11px]">({primaryLoc.neighborhood})</span>
          )}
        </div>

        {/* Contacts Grid */}
        <div className="space-y-1.5 text-xs text-slate-400 mb-4 pt-3 border-t border-slate-800/80">
          {primaryPhone ? (
            <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{primaryPhone.normalizedPhone || primaryPhone.originalPhone}</span>
              {primaryPhone.phoneType === 'mobile' && (
                <span className="text-[9px] px-1 bg-slate-800 text-slate-400 rounded">Mobil</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <Phone className="w-3 h-3 shrink-0 opacity-40" />
              <span>Telefon doğrulanmamış</span>
            </div>
          )}

          {primaryWeb ? (
            <div className="flex items-center gap-2 text-cyan-300 text-[11px] truncate">
              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{primaryWeb.domain || primaryWeb.originalUrl}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <Globe className="w-3 h-3 shrink-0 opacity-40" />
              <span>Web sitesi yok</span>
            </div>
          )}

          {business.emails && business.emails.length > 0 && (
            <div className="flex items-center gap-2 text-purple-300 text-[11px] truncate">
              <Mail className="w-3 h-3 text-purple-400 shrink-0" />
              <span className="truncate">{business.emails[0].email}</span>
            </div>
          )}

          {business.socials && business.socials.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500">Kanallar:</span>
              <div className="flex items-center gap-1">
                {business.socials.map((s, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      s.platform === 'instagram'
                        ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20'
                        : s.platform === 'linkedin'
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {s.platform === 'instagram' && <Instagram className="w-2.5 h-2.5 text-pink-400" />}
                    {s.platform === 'linkedin' && <Linkedin className="w-2.5 h-2.5 text-blue-400" />}
                    <span className="capitalize">{s.platform}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
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
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-semibold border border-blue-500/20 transition-colors"
            title="Google Haritalar'da İşletme Kartını Aç"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>Google Maps</span>
          </a>
        </div>

        <button className="flex items-center gap-1 text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
          <span>İncele</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
