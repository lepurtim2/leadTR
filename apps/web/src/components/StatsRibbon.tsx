import React from 'react';
import { Building2, MapPin, CheckCircle2, Tags, Globe, Shield } from 'lucide-react';

interface StatsRibbonProps {
  totalCount?: number;
  provinceCount?: number;
  categoryCount?: number;
}

export const StatsRibbon: React.FC<StatsRibbonProps> = ({
  totalCount = 124850,
  provinceCount = 81,
  categoryCount = 64,
}) => {
  const stats = [
    {
      label: 'Kayıtlı İşletme',
      value: totalCount.toLocaleString('tr-TR'),
      icon: Building2,
      color: 'text-cyan-400',
    },
    {
      label: 'İl Kapsamı',
      value: `${provinceCount} İl (Tüm TR)`,
      icon: MapPin,
      color: 'text-emerald-400',
    },
    {
      label: 'İşletme Kategorisi',
      value: `${categoryCount} Taksonomi`,
      icon: Tags,
      color: 'text-purple-400',
    },
    {
      label: 'Mekânsal Doğruluk',
      value: 'PostGIS EPSG:4326',
      icon: Globe,
      color: 'text-blue-400',
    },
    {
      label: 'Provenance',
      value: 'Overture + OSM + Crawl',
      icon: Shield,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div
            key={i}
            className="glass-panel p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center gap-3 transition-all hover:border-slate-700"
          >
            <div className={`p-2 rounded-lg bg-slate-800/80 ${stat.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">{stat.label}</p>
              <p className="text-xs sm:text-sm font-bold text-white font-mono">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
