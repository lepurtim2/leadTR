import React from 'react';
import { Building2, MapPin, Tags, Globe, Shield } from 'lucide-react';

interface StatsRibbonProps {
  totalCount?: number;
  provinceCount?: number;
  categoryCount?: number;
  phoneCount?: number;
  websiteCount?: number;
}

export const StatsRibbon: React.FC<StatsRibbonProps> = ({
  totalCount = 1885512,
  provinceCount = 81,
  categoryCount = 33,
  phoneCount = 1142013,
  websiteCount = 633282,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 py-3 px-4 bg-panel rounded-card border border-border">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Primary stat — total count, visually prominent */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <span className="text-[20px] font-bold text-foreground tabular-nums">
            {totalCount.toLocaleString('tr-TR')}
          </span>
          <span className="text-small text-muted">Kayıtlı İşletme</span>
        </div>

        <div className="w-px h-5 bg-border hidden sm:block" />

        {/* Secondary stats — smaller, inline */}
        {[
          { label: 'İl Kapsamı', value: `${provinceCount} İl`, icon: MapPin },
          { label: 'Doğrulanmış Tel', value: phoneCount > 1000000 ? `${(phoneCount / 1000000).toFixed(2)}M` : phoneCount.toLocaleString('tr-TR'), icon: Globe },
          { label: 'Aktif Web', value: websiteCount > 1000 ? `${(websiteCount / 1000).toFixed(0)}K` : websiteCount.toLocaleString('tr-TR'), icon: Globe },
          { label: 'Kaynak', value: 'Overture + OSM + HDX', icon: Shield },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="flex items-center gap-1.5 text-small">
              <Icon className="w-3 h-3 text-muted" />
              <span className="text-muted">{stat.label}:</span>
              <span className="font-medium text-foreground">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Bi-Monthly Sync & Health Telemetry Badge */}
      <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold">Oto-Güncelleme:</span>
        <span className="text-emerald-300">Ayda 2 Kez (Aktif & Denetimli)</span>
      </div>
    </div>
  );
};
