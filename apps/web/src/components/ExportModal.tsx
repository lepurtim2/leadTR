'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  Sparkles,
  Phone,
  Globe,
  Check,
  Filter,
  MapPin,
  Building2,
  Search,
} from 'lucide-react';
import { TURKISH_PROVINCES, getDistrictsForProvince } from '@leadtr/validation';

export interface ExportFilters {
  query?: string;
  province?: string;
  district?: string;
  categorySlug?: string;
  minLeadScore?: number;
  hasPhoneOnly?: boolean;
  hasWebsiteOnly?: boolean;
  hasNoWebsiteOnly?: boolean;
  sortBy?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterSummary?: string;
  totalAvailable?: number;
  filters?: ExportFilters;
}

type LeadTargetOption = 'all' | 'phone_no_web' | 'both' | 'phone_only';

const CATEGORY_OPTIONS = [
  { slug: '', label: 'Tüm Sektörler & Kategoriler' },
  { slug: 'spor-salonu', label: 'Spor Salonu & Fitness' },
  { slug: 'dis-klinigi', label: 'Diş Kliniği & Diş Hekimi' },
  { slug: 'hastane', label: 'Hastane' },
  { slug: 'eczane', label: 'Eczane' },
  { slug: 'klinik', label: 'Klinik & Poliklinik' },
  { slug: 'veteriner', label: 'Veteriner Kliniği' },
  { slug: 'hukuk-burosu', label: 'Hukuk Bürosu & Avukat' },
  { slug: 'noter', label: 'Noter' },
  { slug: 'muhasebe', label: 'Mali Müşavir & Muhasebe' },
  { slug: 'finans', label: 'Finans & Banka' },
  { slug: 'sigorta', label: 'Sigorta Acentesi' },
  { slug: 'emlak-ofisi', label: 'Emlak Ofisi & Gayrimenkul' },
  { slug: 'otel', label: 'Otel & Konaklama' },
  { slug: 'restoran', label: 'Restoran & Lokanta' },
  { slug: 'kafe', label: 'Kafe & Kahve' },
  { slug: 'firincilik', label: 'Fırın & Pastane' },
  { slug: 'kuafor', label: 'Kuaför & Berber' },
  { slug: 'guzellik-merkezi', label: 'Güzellik Merkezi' },
  { slug: 'oto-servis', label: 'Oto Servis & Tamir' },
  { slug: 'oto-yikama', label: 'Oto Yıkama' },
  { slug: 'kuyumcu', label: 'Kuyumcu & Mücevher' },
  { slug: 'optik', label: 'Optik & Gözlük' },
  { slug: 'supermarket', label: 'Market & Süpermarket' },
  { slug: 'nalburiye', label: 'Nalburiye & Hırdavat' },
  { slug: 'kargo', label: 'Kargo & Lojistik' },
  { slug: 'akaryakit', label: 'Akaryakıt & Petrol' },
];

const POPULAR_DISTRICTS: Record<string, string[]> = {
  istanbul: ['Şişli', 'Kadıköy', 'Beşiktaş', 'Ümraniye', 'Bakırköy', 'Fatih', 'Ataşehir', 'Sarıyer', 'Maltepe', 'Pendik'],
  ankara: ['Çankaya', 'Yenimahalle', 'Keçiören', 'Mamak', 'Etimesgut', 'Sincan'],
  izmir: ['Konak', 'Bornova', 'Karşıyaka', 'Bayraklı', 'Buca', 'Çiğli'],
  bursa: ['Nilüfer', 'Osmangazi', 'Yıldırım'],
  antalya: ['Muratpaşa', 'Konyaaltı', 'Kepez', 'Alanya'],
  adana: ['Seyhan', 'Çukurova', 'Yüreğir'],
  kocaeli: ['İzmit', 'Gebze', 'Darıca'],
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  totalAvailable = 100,
  filters = {},
}) => {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');

  // Interactive Target Region & Category State
  const [targetProvince, setTargetProvince] = useState<string>(filters.province || '');
  const [targetDistrict, setTargetDistrict] = useState<string>(filters.district || '');
  const [targetCategory, setTargetCategory] = useState<string>(filters.categorySlug || '');
  const [targetQuery, setTargetQuery] = useState<string>(filters.query || '');

  // Determine initial lead target from incoming filters
  const initialTarget: LeadTargetOption =
    filters.hasPhoneOnly && filters.hasNoWebsiteOnly
      ? 'phone_no_web'
      : filters.hasPhoneOnly && filters.hasWebsiteOnly
      ? 'both'
      : filters.hasPhoneOnly
      ? 'phone_only'
      : 'all';

  const [leadTarget, setLeadTarget] = useState<LeadTargetOption>(initialTarget);
  const [liveCount, setLiveCount] = useState<number>(totalAvailable);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  const defaultCount = Math.min(1000, totalAvailable > 0 ? totalAvailable : 100);
  const [recordCount, setRecordCount] = useState<number>(defaultCount);
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Synchronize state when modal opens or incoming filters change
  useEffect(() => {
    if (isOpen) {
      setTargetProvince(filters.province || '');
      setTargetDistrict(filters.district || '');
      setTargetCategory(filters.categorySlug || '');
      setTargetQuery(filters.query || '');
      if (filters.hasPhoneOnly && filters.hasNoWebsiteOnly) {
        setLeadTarget('phone_no_web');
      } else if (filters.hasPhoneOnly && filters.hasWebsiteOnly) {
        setLeadTarget('both');
      } else if (filters.hasPhoneOnly) {
        setLeadTarget('phone_only');
      }
    }
  }, [isOpen, filters.province, filters.district, filters.categorySlug, filters.query, filters.hasPhoneOnly, filters.hasWebsiteOnly, filters.hasNoWebsiteOnly]);

  // Recalculate DuckDB live count dynamically whenever filters change
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isOpen) return;
      setIsCounting(true);
      try {
        const params = new URLSearchParams();
        if (targetQuery && targetQuery.trim()) params.set('query', targetQuery.trim());
        if (targetProvince && targetProvince.trim()) params.set('province', targetProvince.trim());
        if (targetDistrict && targetDistrict.trim()) params.set('district', targetDistrict.trim());
        if (targetCategory && targetCategory.trim()) params.set('categorySlug', targetCategory.trim());
        if (filters.minLeadScore && filters.minLeadScore > 0) params.set('minLeadScore', String(filters.minLeadScore));

        if (leadTarget === 'phone_no_web') {
          params.set('hasPhone', 'true');
          params.set('hasNoWebsite', 'true');
        } else if (leadTarget === 'both') {
          params.set('hasPhone', 'true');
          params.set('hasWebsite', 'true');
        } else if (leadTarget === 'phone_only') {
          params.set('hasPhone', 'true');
        } else {
          if (filters.hasPhoneOnly) params.set('hasPhone', 'true');
          if (filters.hasWebsiteOnly) params.set('hasWebsite', 'true');
          if (filters.hasNoWebsiteOnly) params.set('hasNoWebsite', 'true');
        }

        const res = await fetch(`${API_BASE}/api/v1/businesses/count?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const count = data.count ?? 0;
            setLiveCount(count);
            setRecordCount((prev) => (prev > count && count > 0 ? count : prev === 0 ? Math.min(100, count) : prev));
          }
        }
      } catch (err) {
        console.error('Count error in ExportModal:', err);
      } finally {
        if (isMounted) setIsCounting(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    targetProvince,
    targetDistrict,
    targetCategory,
    targetQuery,
    leadTarget,
    isOpen,
    filters.minLeadScore,
    filters.hasPhoneOnly,
    filters.hasWebsiteOnly,
    filters.hasNoWebsiteOnly,
    API_BASE,
  ]);

  if (!isOpen) return null;

  const effectiveMax = Math.min(recordCount, liveCount || recordCount);
  const creditCost = Math.ceil(effectiveMax / 10);

  const handleExport = () => {
    setIsExporting(true);
    setIsSuccess(false);

    const params = new URLSearchParams();
    if (targetQuery && targetQuery.trim()) params.set('query', targetQuery.trim());
    if (targetProvince && targetProvince.trim()) params.set('province', targetProvince.trim());
    if (targetDistrict && targetDistrict.trim()) params.set('district', targetDistrict.trim());
    if (targetCategory && targetCategory.trim()) params.set('categorySlug', targetCategory.trim());
    if (filters.minLeadScore && filters.minLeadScore > 0) params.set('minLeadScore', String(filters.minLeadScore));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);

    // Apply active leadTarget override
    if (leadTarget === 'phone_no_web') {
      params.set('hasPhone', 'true');
      params.set('hasNoWebsite', 'true');
    } else if (leadTarget === 'both') {
      params.set('hasPhone', 'true');
      params.set('hasWebsite', 'true');
    } else if (leadTarget === 'phone_only') {
      params.set('hasPhone', 'true');
    } else {
      if (filters.hasPhoneOnly) params.set('hasPhone', 'true');
      if (filters.hasWebsiteOnly) params.set('hasWebsite', 'true');
      if (filters.hasNoWebsiteOnly) params.set('hasNoWebsite', 'true');
    }

    params.set('maxRecords', String(effectiveMax));
    params.set('format', format);

    const downloadUrl = `${API_BASE}/api/v1/exports/download?${params.toString()}`;

    // Clean descriptive filename
    const dateStr = new Date().toISOString().slice(0, 10);
    const parts = ['leadtr'];
    if (targetProvince) parts.push(targetProvince.toLowerCase());
    if (targetDistrict) parts.push(targetDistrict.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (targetCategory) parts.push(targetCategory);
    parts.push(dateStr);
    const filename = `${parts.join('_')}.${format === 'csv' ? 'csv' : 'xlsx'}`;

    // Trigger instant browser file download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedCount(effectiveMax);

    setTimeout(() => {
      setIsExporting(false);
      setIsSuccess(true);
    }, 1200);
  };

  const countPresets = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1.000', value: 1000 },
    { label: '5.000', value: 5000 },
    { label: `Tümü (${liveCount.toLocaleString('tr-TR')})`, value: Math.min(liveCount || 10000, 50000) },
  ];

  const currentPopularDistricts = targetProvince ? POPULAR_DISTRICTS[targetProvince.toLowerCase()] || [] : [];
  const availableDistricts = targetProvince ? getDistrictsForProvince(targetProvince) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-5 sm:p-7 relative max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Toplu Lead Dışa Aktar</h3>
            <p className="text-xs text-slate-400">
              Hedef bölge, ilçe ve kategoriye göre filtrelenmiş verileri Excel/CSV olarak indirin
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">İndirme Tamamlandı!</h4>
              <p className="text-xs text-slate-300 mt-1">
                <span className="text-cyan-400 font-bold">{downloadedCount.toLocaleString('tr-TR')}</span> adet firma kaydı UTF-8 Türkçe Excel uyumlu dosya olarak bilgisayarınıza aktarıldı.
              </p>
              <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Harcanan Kredi: <strong className="text-white">{Math.ceil(downloadedCount / 10)} Kredi</strong></span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20"
              >
                Tamam
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── 1. Target Region, District & Category Controls ── */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Hedef Bölge, İlçe & Sektör Seçimi
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <Database className="w-3 h-3" /> DuckDB Motoru
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* İl (Province) Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">İl (Şehir)</label>
                  <select
                    value={targetProvince}
                    onChange={(e) => {
                      setTargetProvince(e.target.value);
                      setTargetDistrict(''); // Reset district on province change
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">Tüm Türkiye (81 İl)</option>
                    {TURKISH_PROVINCES.map((p) => (
                      <option key={p.plate} value={p.normalized}>
                        {p.plate.toString().padStart(2, '0')} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* İlçe (District) Dropdown Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                    <span>İlçe Seçimi</span>
                    {targetDistrict && (
                      <button
                        type="button"
                        onClick={() => setTargetDistrict('')}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Tümü
                      </button>
                    )}
                  </label>
                  <select
                    value={targetDistrict}
                    onChange={(e) => setTargetDistrict(e.target.value)}
                    disabled={!targetProvince}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {targetProvince ? 'Tüm İlçeler' : 'Önce İl Seçiniz'}
                    </option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori (Category) Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> Sektör / Kategori
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick District Chips */}
              {currentPopularDistricts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Popüler İlçeler:</span>
                  {currentPopularDistricts.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDistrict(d)}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                        targetDistrict.toLowerCase() === d.toLowerCase()
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Query */}
              <div className="relative pt-1">
                <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={targetQuery}
                  onChange={(e) => setTargetQuery(e.target.value)}
                  placeholder="İsteğe bağlı ek arama terimi (Örn: Pilates, Crossfit, Kebap, Dent...)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* ── 2. Lead Targeting Options ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Dışa Aktarma İletişim Filtresi</span>
                <span className="text-[11px] font-mono font-bold text-cyan-400">
                  {isCounting ? (
                    <span className="animate-pulse">DuckDB Taranıyor...</span>
                  ) : (
                    `${liveCount.toLocaleString('tr-TR')} Firma Bulundu`
                  )}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option 1: Phone + No Website */}
                <button
                  type="button"
                  onClick={() => setLeadTarget('phone_no_web')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    leadTarget === 'phone_no_web'
                      ? 'border-amber-500/80 bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${leadTarget === 'phone_no_web' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Telefonlu & Web Sitesiz</span>
                      {leadTarget === 'phone_no_web' && <Check className="w-3 h-3 text-amber-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Web tasarım ve dijital ajans leadleri</p>
                  </div>
                </button>

                {/* Option 2: Both Phone & Website */}
                <button
                  type="button"
                  onClick={() => setLeadTarget('both')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    leadTarget === 'both'
                      ? 'border-cyan-500/80 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${leadTarget === 'both' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Hem Telefon Hem Web</span>
                      {leadTarget === 'both' && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Eksiksiz tam iletişim profilleri</p>
                  </div>
                </button>

                {/* Option 3: Phone Only */}
                <button
                  type="button"
                  onClick={() => setLeadTarget('phone_only')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    leadTarget === 'phone_only'
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${leadTarget === 'phone_only' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Sadece Telefonu Olanlar</span>
                      {leadTarget === 'phone_only' && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Doğrudan aranabilir tüm firmalar</p>
                  </div>
                </button>

                {/* Option 4: All Filtered */}
                <button
                  type="button"
                  onClick={() => setLeadTarget('all')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    leadTarget === 'all'
                      ? 'border-indigo-500/80 bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${leadTarget === 'all' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Tüm Kayıtlar</span>
                      {leadTarget === 'all' && <Check className="w-3 h-3 text-indigo-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filtredeki tüm işletmeler</p>
                  </div>
                </button>
              </div>
            </div>

            {/* ── 3. Record Count Selector ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">İndirilecek Kayıt Adedi</label>
                <span className="text-xs text-cyan-400 font-mono font-bold">
                  {effectiveMax.toLocaleString('tr-TR')} Firma
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {countPresets.map((preset) => {
                  const isSelected = recordCount === preset.value;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setRecordCount(preset.value)}
                      className={`py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/20 text-white font-bold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 4. Format Selection ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Dosya Biçimi</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'csv', label: 'CSV (Excel Uyumlu)', desc: 'UTF-8 BOM ile doğrudan Excelde açılır' },
                  { id: 'xlsx', label: 'Excel Tablosu', desc: 'Tüm sütunlar düzenlenmiş format' },
                ].map((f) => {
                  const isSelected = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id as any)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <div>
                          <span className="text-xs font-bold block">{f.label}</span>
                          <span className="text-[10px] text-slate-500">{f.desc}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 5. Credit Cost Preview ── */}
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400">Gereken B2B Kredisi:</span>
              <span className="font-mono font-bold text-amber-400">
                {creditCost} Kredi <span className="text-[10px] text-slate-500 font-normal">(10 lead = 1 kredi)</span>
              </span>
            </div>

            {/* ── 6. Download Button ── */}
            <button
              onClick={handleExport}
              disabled={isExporting || effectiveMax === 0}
              className="w-full py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Hazırlanıyor & İndiriliyor...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Listeyi İndir ({effectiveMax.toLocaleString('tr-TR')} Firma)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
