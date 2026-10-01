'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  Phone,
  Globe,
  Check,
  Filter,
  MapPin,
  Building2,
  Search,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { TURKISH_PROVINCES, getDistrictsForProvince } from '@leadtr/validation';

export interface ExportFilters {
  query?: string;
  province?: string;
  district?: string;
  categorySlug?: string;
  minLeadScore?: number;
  hasPhoneOnly?: boolean;
  onlyMobilePhone?: boolean;
  urgentLeadOnly?: boolean;
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

type LeadTargetOption = 'all' | 'whatsapp_mobile' | 'phone_no_web' | 'both' | 'phone_only';

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

  const [targetProvince, setTargetProvince] = useState<string>(filters.province || '');
  const [targetDistrict, setTargetDistrict] = useState<string>(filters.district || '');
  const [targetCategory, setTargetCategory] = useState<string>(filters.categorySlug || '');
  const [targetQuery, setTargetQuery] = useState<string>(filters.query || '');

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

  const inputClass = 'w-full px-3 py-1.5 text-small bg-panel border border-border rounded-card text-foreground focus:outline-none focus:border-accent cursor-pointer transition-colors';

  // Synchronize state when modal opens or incoming filters change
  useEffect(() => {
    if (isOpen) {
      setTargetProvince(filters.province || '');
      setTargetDistrict(filters.district || '');
      setTargetCategory(filters.categorySlug || '');
      setTargetQuery(filters.query || '');
      if (filters.onlyMobilePhone) {
        setLeadTarget('whatsapp_mobile');
      } else if (filters.urgentLeadOnly || (filters.hasPhoneOnly && filters.hasNoWebsiteOnly)) {
        setLeadTarget('phone_no_web');
      } else if (filters.hasPhoneOnly && filters.hasWebsiteOnly) {
        setLeadTarget('both');
      } else if (filters.hasPhoneOnly) {
        setLeadTarget('phone_only');
      }
    }
  }, [
    isOpen,
    filters.province,
    filters.district,
    filters.categorySlug,
    filters.query,
    filters.onlyMobilePhone,
    filters.urgentLeadOnly,
    filters.hasPhoneOnly,
    filters.hasWebsiteOnly,
    filters.hasNoWebsiteOnly,
  ]);

  // Recalculate DuckDB live count dynamically
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

        if (leadTarget === 'whatsapp_mobile') {
          params.set('onlyMobilePhone', 'true');
          params.set('hasWhatsApp', 'true');
        } else if (leadTarget === 'phone_no_web') {
          params.set('urgentLeadOnly', 'true');
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

    if (leadTarget === 'whatsapp_mobile') {
      params.set('onlyMobilePhone', 'true');
      params.set('hasWhatsApp', 'true');
    } else if (leadTarget === 'phone_no_web') {
      params.set('urgentLeadOnly', 'true');
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

    const dateStr = new Date().toISOString().slice(0, 10);
    const parts = ['leadtr'];
    if (targetProvince) parts.push(targetProvince.toLowerCase());
    if (targetDistrict) parts.push(targetDistrict.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (targetCategory) parts.push(targetCategory);
    parts.push(dateStr);
    const filename = `${parts.join('_')}.${format === 'csv' ? 'csv' : 'xlsx'}`;

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

  const LEAD_TARGETS = [
    {
      id: 'whatsapp_mobile' as LeadTargetOption,
      label: '📱 WhatsApp / Mobil (05xx)',
      desc: 'Doğrudan WhatsApp mesajı atılabilir 05xx cep numaraları',
      icon: MessageCircle,
      color: 'positive',
    },
    {
      id: 'phone_no_web' as LeadTargetOption,
      label: '🔥 Sıcak Lead (Web Sitesiz)',
      desc: 'Web sitesi olmayan, web ajansları ve SEO için sıcak leadler',
      icon: Zap,
      color: 'warning',
    },
    {
      id: 'both' as LeadTargetOption,
      label: 'Telefonlu & Web siteli',
      desc: 'Dijital varlığı olan, kurumsal hizmet hedefleri',
      icon: Globe,
      color: 'accent',
    },
    {
      id: 'phone_only' as LeadTargetOption,
      label: 'Sadece Telefon Doğrulanmış',
      desc: 'Çağrı merkezi ve telefon satış aramaları',
      icon: Phone,
      color: 'positive',
    },
    {
      id: 'all' as LeadTargetOption,
      label: 'Tüm Kayıtlar',
      desc: 'Seçili bölge ve sektördeki tüm işletmeler',
      icon: Database,
      color: 'muted',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-modal border border-border bg-panel shadow-2xl p-5 sm:p-6 relative max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-card bg-surface text-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-card bg-accent-muted text-accent">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-foreground">Toplu lead dışa aktar</h3>
            <p className="text-small text-muted">
              Hedef bölge, ilçe ve kategoriye göre filtrelenmiş verileri indirin
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-positive/15 border border-positive/30 text-positive flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-section text-foreground">İndirme tamamlandı</h4>
              <p className="text-small text-muted mt-1">
                <span className="text-accent font-semibold">{downloadedCount.toLocaleString('tr-TR')}</span> firma kaydı bilgisayarınıza aktarıldı.
              </p>
              <p className="text-[10px] text-muted mt-2">
                Harcanan: <span className="text-foreground font-medium">{Math.ceil(downloadedCount / 10)} Kredi</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-card bg-accent hover:bg-accent-hover text-white font-medium text-[13px] transition-colors"
            >
              Tamam
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 1. Target Region */}
            <div className="p-3 rounded-card bg-surface border border-border space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-small font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-muted" /> Hedef bölge ve sektör
                </span>
                <span className="text-[10px] text-muted font-mono flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" /> DuckDB
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Province */}
                <div>
                  <label className="block text-[10px] font-medium text-muted mb-0.5">İl</label>
                  <select
                    value={targetProvince}
                    onChange={(e) => {
                      setTargetProvince(e.target.value);
                      setTargetDistrict('');
                    }}
                    className={inputClass}
                  >
                    <option value="">Tüm Türkiye (81 İl)</option>
                    {TURKISH_PROVINCES.map((p) => (
                      <option key={p.plate} value={p.normalized}>
                        {p.plate.toString().padStart(2, '0')} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-[10px] font-medium text-muted mb-0.5 flex items-center justify-between">
                    <span>İlçe</span>
                    {targetDistrict && (
                      <button
                        type="button"
                        onClick={() => setTargetDistrict('')}
                        className="text-[10px] text-accent hover:text-accent-hover"
                      >
                        Tümü
                      </button>
                    )}
                  </label>
                  <select
                    value={targetDistrict}
                    onChange={(e) => setTargetDistrict(e.target.value)}
                    disabled={!targetProvince}
                    className={`${inputClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {targetProvince ? 'Tüm İlçeler' : 'Önce İl Seçin'}
                    </option>
                    {availableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-medium text-muted mb-0.5 flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5" /> Sektör
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className={inputClass}
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
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-muted">Popüler:</span>
                  {currentPopularDistricts.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTargetDistrict(d)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-card border transition-colors ${
                        targetDistrict.toLowerCase() === d.toLowerCase()
                          ? 'border-accent bg-accent-muted text-accent font-medium'
                          : 'border-border bg-surface text-muted hover:text-foreground hover:border-border-hover'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Optional Query */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-muted" />
                <input
                  type="text"
                  value={targetQuery}
                  onChange={(e) => setTargetQuery(e.target.value)}
                  placeholder="Ek arama terimi (Pilates, Crossfit, Kebap…)"
                  className={`${inputClass} pl-7`}
                />
              </div>
            </div>

            {/* 2. Lead Targeting */}
            <div>
              <label className="block text-small font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>İletişim filtresi</span>
                <span className="text-small font-medium text-accent">
                  {isCounting ? (
                    <span className="animate-pulse">Sayılıyor…</span>
                  ) : (
                    `${liveCount.toLocaleString('tr-TR')} firma`
                  )}
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LEAD_TARGETS.map((target) => {
                  const Icon = target.icon;
                  const isSelected = leadTarget === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setLeadTarget(target.id)}
                      className={`p-2.5 rounded-card border text-left transition-colors flex items-start gap-2 ${
                        isSelected
                          ? 'border-accent bg-accent-muted'
                          : 'border-border bg-surface hover:border-border-hover text-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`} />
                      <div>
                        <div className="text-small font-medium text-foreground flex items-center gap-1">
                          <span>{target.label}</span>
                          {isSelected && <Check className="w-3 h-3 text-accent" />}
                        </div>
                        <p className="text-[10px] text-muted mt-0.5">{target.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Record Count */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-small font-semibold text-foreground">Kayıt adedi</label>
                <span className="text-small text-accent font-medium">
                  {effectiveMax.toLocaleString('tr-TR')} firma
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {countPresets.map((preset) => {
                  const isSelected = recordCount === preset.value;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setRecordCount(preset.value)}
                      className={`py-1.5 px-1 text-center rounded-card border text-small font-medium transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent-muted text-accent font-semibold'
                          : 'border-border bg-surface text-muted hover:text-foreground hover:border-border-hover'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Format Selection */}
            <div>
              <label className="block text-small font-semibold text-foreground mb-1">Dosya biçimi</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'csv', label: 'CSV (Excel Uyumlu)', desc: 'UTF-8 BOM ile Excelde açılır' },
                  { id: 'xlsx', label: 'Excel Tablosu', desc: 'Sütunlar düzenlenmiş format' },
                ].map((f) => {
                  const isSelected = format === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id as any)}
                      className={`p-2.5 rounded-card border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-accent bg-accent-muted'
                          : 'border-border bg-surface hover:border-border-hover text-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-accent' : 'text-muted'}`} />
                        <div>
                          <span className="text-small font-medium text-foreground block">{f.label}</span>
                          <span className="text-[10px] text-muted">{f.desc}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3 h-3 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Credit Cost */}
            <div className="p-2 rounded-card bg-surface border border-border flex items-center justify-between text-small">
              <span className="text-muted">Gereken kredi:</span>
              <span className="font-medium text-warning">
                {creditCost} Kredi <span className="text-[10px] text-muted font-normal">(10 lead = 1 kredi)</span>
              </span>
            </div>

            {/* 6. Download Button */}
            <button
              onClick={handleExport}
              disabled={isExporting || effectiveMax === 0}
              className="w-full py-3 rounded-card font-semibold text-[13px] bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Hazırlanıyor…</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Listeyi indir ({effectiveMax.toLocaleString('tr-TR')} firma)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
