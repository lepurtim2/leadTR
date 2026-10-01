'use client';

import React from 'react';
import { Download, Zap, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenExport?: () => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

const NAV_ITEMS = [
  { id: 'search', label: 'Veri Keşfi', icon: Zap },
  { id: 'categories', label: 'Sektör & Kategoriler', icon: Layers },
];

export const Header: React.FC<HeaderProps> = ({
  onOpenExport,
  activeTab = 'search',
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-surface/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand: Clean, razor-sharp typography without bulky icon */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab?.('search')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
          >
            <span className="text-[19px] font-bold tracking-tight text-foreground select-none">
              Lead<span className="text-accent font-black">TR</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-muted text-accent border border-accent/20 tracking-wider uppercase font-mono">
              B2B
            </span>
          </button>
        </div>

        {/* Navigation: Segmented sleek pills (Clean & Decluttered) */}
        <nav className="flex items-center p-1 rounded-card bg-panel border border-border/80 text-small">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab?.(item.id)}
                className={`px-3 py-1 text-[12.5px] font-medium rounded-card transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-surface text-accent font-semibold shadow-sm border border-border'
                    : 'text-muted hover:text-foreground border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action & Live Telemetry */}
        <div className="flex items-center gap-3">
          {/* Live Engine Status Badge */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-card bg-panel border border-border text-[11px] text-muted font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-foreground font-semibold">DuckDB</span>
            <span className="text-border">•</span>
            <span>1.88M Kayıt</span>
          </div>

          {/* Quick Header Export Button (Subtle & Refined) */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-card bg-panel hover:bg-surface-hover border border-border hover:border-accent/40 text-foreground transition-all duration-150"
            title="Filtrelenmiş işletmeleri Excel veya CSV olarak dışa aktar"
          >
            <Download className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
