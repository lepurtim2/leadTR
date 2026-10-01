'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Phone,
  Globe,
  ChevronDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  LayoutGrid,
  Map as MapIcon,
  Download,
  MessageCircle,
  Zap,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { StatsRibbon } from '@/components/StatsRibbon';
import { BusinessCard } from '@/components/BusinessCard';
import { BusinessModal } from '@/components/BusinessModal';
import { ExportModal } from '@/components/ExportModal';
import { TURKISH_PROVINCES, getDistrictsForProvince } from '@leadtr/validation';
import type { BusinessDTO, PaginatedResult } from '@leadtr/types';

const BusinessMap = dynamic(
  () => import('@/components/BusinessMap').then((mod) => mod.BusinessMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-card bg-panel border border-border flex items-center justify-center text-muted text-small">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Harita yükleniyor…</span>
        </div>
      </div>
    ),
  }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const districtsForPage = selectedProvince ? getDistrictsForProvince(selectedProvince) : [];
  const [minLeadScore, setMinLeadScore] = useState(0);
  const [hasPhoneOnly, setHasPhoneOnly] = useState(false);
  const [onlyMobilePhone, setOnlyMobilePhone] = useState(false);
  const [urgentLeadOnly, setUrgentLeadOnly] = useState(false);
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [hasNoWebsiteOnly, setHasNoWebsiteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'leadScore' | 'name' | 'createdAt'>('leadScore');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Live Data States
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overallTotalCount, setOverallTotalCount] = useState(1885512);
  const [totalPhonesCount, setTotalPhonesCount] = useState(1142013);
  const [totalWebsitesCount, setTotalWebsitesCount] = useState(633282);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDTO | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch overall total count and verified channels once on mount
  useEffect(() => {
    async function fetchOverallStats() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/system/stats`);
        if (res.ok) {
          const json = await res.json();
          if (json.stats) {
            setOverallTotalCount(json.stats.total_businesses ?? 1885512);
            setTotalPhonesCount(json.stats.total_phones ?? 1142013);
            setTotalWebsitesCount(json.stats.total_websites ?? 633282);
          }
        }
      } catch (err) {
        console.warn('Could not fetch system stats:', err);
      }
    }
    fetchOverallStats();
  }, []);

  // Fetch live businesses with active filters
  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      if (selectedProvince) params.set('province', selectedProvince);
      if (selectedDistrict) params.set('district', selectedDistrict);
      if (selectedCategory) params.set('categorySlug', selectedCategory);
      if (minLeadScore > 0) params.set('minLeadScore', String(minLeadScore));
      if (hasPhoneOnly) params.set('hasPhone', 'true');
      if (onlyMobilePhone) {
        params.set('onlyMobilePhone', 'true');
        params.set('hasWhatsApp', 'true');
      }
      if (urgentLeadOnly) {
        params.set('urgentLeadOnly', 'true');
      }
      if (hasWebsiteOnly) params.set('hasWebsite', 'true');
      if (hasNoWebsiteOnly) params.set('hasNoWebsite', 'true');
      params.set('sortBy', sortBy);
      params.set('page', String(page));
      params.set('limit', viewMode === 'map' ? '1000' : '18');

      const res = await fetch(`${API_BASE}/api/v1/businesses?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`API Hatası: ${res.status}`);
      }

      const json: PaginatedResult<BusinessDTO> = await res.json();
      setBusinesses(json.data || []);
      setTotalCount(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Veriler sunucudan alınırken bir hata oluştu. Lütfen API servisinin çalıştığından emin olun.');
      setBusinesses([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    selectedProvince,
    selectedDistrict,
    selectedCategory,
    minLeadScore,
    hasPhoneOnly,
    onlyMobilePhone,
    urgentLeadOnly,
    hasWebsiteOnly,
    hasNoWebsiteOnly,
    sortBy,
    page,
    viewMode,
  ]);

  // Trigger search on filter changes (resetting page to 1 when filters change)
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  /* ── Shared input styles ── */
  const inputClass = 'w-full px-3 py-2 text-[13px] bg-panel border border-border rounded-card text-foreground placeholder-muted focus:outline-none focus:border-accent transition-colors';
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <div className="min-h-screen flex flex-col bg-surface text-foreground">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search Tab View */}
        {activeTab === 'search' && (
          <>
            {/* Hero Section */}
            <div className="space-y-3 max-w-2xl">
              <h1 className="text-display text-foreground">
                Türkiye&apos;nin Doğrulanmış İşletme ve Lead Platformu
              </h1>
              <p className="text-body text-muted">
                81 ildeki işletmeleri harita koordinatları, doğrulanmış iletişim kanalları, dijital varlık ve lead skorlarıyla keşfedin ve dışa aktarın.
              </p>
            </div>

            {/* Platform Metrics Ribbon */}
            <StatsRibbon
              totalCount={overallTotalCount > 0 ? overallTotalCount : totalCount}
              provinceCount={81}
              categoryCount={64}
              phoneCount={totalPhonesCount}
              websiteCount={totalWebsitesCount}
            />

            {/* Search and Filters Hub */}
            <div className="bg-panel p-4 rounded-card border border-border space-y-3">
              {/* Primary Search Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* Text query input */}
                <div className="md:col-span-4 relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                    placeholder="Firma veya anahtar kelime…"
                    className={`${inputClass} pl-8`}
                  />
                </div>

                {/* Province Dropdown */}
                <div className="md:col-span-3 relative">
                  <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted" />
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      handleFilterChange(setSelectedProvince, e.target.value);
                      setSelectedDistrict('');
                    }}
                    className={`${selectClass} pl-8 pr-7`}
                  >
                    <option value="">Tüm Türkiye (81 İl)</option>
                    {TURKISH_PROVINCES.map((p) => (
                      <option key={p.plate} value={p.normalized}>
                        {p.plate.toString().padStart(2, '0')} - {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted pointer-events-none" />
                </div>

                {/* District Dropdown */}
                <div className="md:col-span-2 relative">
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleFilterChange(setSelectedDistrict, e.target.value)}
                    disabled={!selectedProvince}
                    className={`${selectClass} pr-7 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <option value="">
                      {selectedProvince ? 'Tüm İlçeler' : 'Önce İl Seçin'}
                    </option>
                    {districtsForPage.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted pointer-events-none" />
                </div>

                {/* Category Dropdown */}
                <div className="md:col-span-3 relative">
                  <Building2 className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
                    className={`${selectClass} pl-8 pr-7`}
                  >
                    <option value="">Tüm Kategoriler</option>
                    <option value="hastane">Hastane</option>
                    <option value="eczane">Eczane</option>
                    <option value="dis-klinigi">Diş Kliniği</option>
                    <option value="klinik">Klinik &amp; Poliklinik</option>
                    <option value="veteriner">Veteriner Kliniği</option>
                    <option value="optik">Optik &amp; Gözlük</option>
                    <option value="hukuk-burosu">Hukuk Bürosu &amp; Avukat</option>
                    <option value="noter">Noter</option>
                    <option value="muhasebe">Mali Müşavir &amp; Muhasebe</option>
                    <option value="finans">Finans &amp; Banka</option>
                    <option value="sigorta">Sigorta Acentesi</option>
                    <option value="emlak-ofisi">Emlak Ofisi &amp; Gayrimenkul</option>
                    <option value="otel">Otel &amp; Konaklama</option>
                    <option value="restoran">Restoran &amp; Lokanta</option>
                    <option value="kafe">Kafe &amp; Kahve</option>
                    <option value="firincilik">Fırın &amp; Pastane</option>
                    <option value="oto-servis">Oto Servis &amp; Tamir</option>
                    <option value="oto-yikama">Oto Yıkama</option>
                    <option value="kuafor">Kuaför &amp; Berber</option>
                    <option value="guzellik-merkezi">Güzellik Merkezi</option>
                    <option value="spor-salonu">Spor Salonu &amp; Fitness</option>
                    <option value="kuyumcu">Kuyumcu &amp; Mücevher</option>
                    <option value="supermarket">Market &amp; Süpermarket</option>
                    <option value="nalburiye">Nalburiye &amp; Hırdavat</option>
                    <option value="kargo">Kargo &amp; Lojistik</option>
                    <option value="akaryakit">Akaryakıt &amp; Petrol</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-muted pointer-events-none" />
                </div>
              </div>

              {/* Advanced Filter Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border text-small">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={hasPhoneOnly}
                      onChange={(e) => handleFilterChange(setHasPhoneOnly, e.target.checked)}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <Phone className="w-3 h-3 text-positive" />
                    <span>Telefonlu</span>
                  </label>

                  {/* WhatsApp / Mobil (05xx) Filter Pill */}
                  <label
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-card border cursor-pointer select-none text-[11px] font-medium transition-all ${
                      onlyMobilePhone
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-xs'
                        : 'bg-panel border-border text-muted hover:text-foreground'
                    }`}
                    title="Yalnızca WhatsApp uyumlu 05xx mobil telefon numarasına sahip işletmeleri listele"
                  >
                    <input
                      type="checkbox"
                      checked={onlyMobilePhone}
                      onChange={(e) => handleFilterChange(setOnlyMobilePhone, e.target.checked)}
                      className="sr-only"
                    />
                    <MessageCircle className={`w-3 h-3 ${onlyMobilePhone ? 'text-emerald-400' : 'text-muted'}`} />
                    <span>📱 WhatsApp / Mobil (05xx)</span>
                  </label>

                  {/* Sıcak Satış Lead'i (Acil İhtiyaç) Filter Pill */}
                  <label
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-card border cursor-pointer select-none text-[11px] font-medium transition-all ${
                      urgentLeadOnly
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs'
                        : 'bg-panel border-border text-muted hover:text-foreground'
                    }`}
                    title="Telefonu doğrulanmış fakat web sitesi olmayan, sıcak web tasarım & SEO adayı işletmeleri listele"
                  >
                    <input
                      type="checkbox"
                      checked={urgentLeadOnly}
                      onChange={(e) => handleFilterChange(setUrgentLeadOnly, e.target.checked)}
                      className="sr-only"
                    />
                    <Zap className={`w-3 h-3 ${urgentLeadOnly ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                    <span>🔥 Sıcak Lead (Acil İhtiyaç)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={hasWebsiteOnly}
                      onChange={(e) => {
                        if (e.target.checked) setHasNoWebsiteOnly(false);
                        handleFilterChange(setHasWebsiteOnly, e.target.checked);
                      }}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <Globe className="w-3 h-3 text-accent" />
                    <span>Web siteli</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={hasNoWebsiteOnly}
                      onChange={(e) => {
                        if (e.target.checked) setHasWebsiteOnly(false);
                        handleFilterChange(setHasNoWebsiteOnly, e.target.checked);
                      }}
                      className="w-3.5 h-3.5 rounded cursor-pointer"
                    />
                    <Globe className="w-3 h-3 text-warning" />
                    <span className="text-warning font-medium">Web sitesiz</span>
                  </label>
                </div>

                {/* Score Slider & Sort */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted">Min. Skor:</span>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="10"
                      value={minLeadScore}
                      onChange={(e) => handleFilterChange(setMinLeadScore, Number(e.target.value))}
                      className="w-16 h-1 bg-border rounded appearance-none cursor-pointer"
                    />
                    <span className="font-semibold text-accent">{minLeadScore}+</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-muted">Sırala:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
                      className="bg-panel border border-border rounded-card px-2 py-0.5 text-foreground text-small focus:outline-none cursor-pointer"
                    >
                      <option value="leadScore">Lead Skoru</option>
                      <option value="name">İsim (A-Z)</option>
                      <option value="createdAt">Eklenme Tarihi</option>
                    </select>
                  </div>

                  <button
                    onClick={() => fetchBusinesses()}
                    className="p-1.5 rounded-card bg-panel border border-border hover:border-border-hover text-muted hover:text-foreground transition-colors"
                    title="Yenile"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-section text-foreground">İşletme Kayıtları</h2>
                  <span className="text-small text-muted font-medium">
                    {totalCount.toLocaleString('tr-TR')} sonuç
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* View Mode Toggle */}
                  <div className="flex items-center p-0.5 rounded-card bg-panel border border-border text-small">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-card font-medium transition-colors ${
                        viewMode === 'list'
                          ? 'bg-accent-muted text-accent'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" />
                      <span>Liste</span>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-card font-medium transition-colors ${
                        viewMode === 'map'
                          ? 'bg-accent-muted text-accent'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <MapIcon className="w-3 h-3" />
                      <span>Harita</span>
                    </button>
                  </div>

                  {/* Contextual Primary Export Button */}
                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-card bg-accent hover:bg-accent-hover text-white text-small font-semibold shadow-sm transition-all active:scale-[0.98]"
                    title="Filtrelenmiş işletmeleri Excel / CSV olarak dışa aktar"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Dışa Aktar (Excel / CSV)</span>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-card bg-danger/10 border border-danger/25 text-danger text-small">
                  {error}
                </div>
              )}

              {/* Loading Skeleton */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-panel p-4 rounded-card border border-border space-y-2.5 animate-pulse"
                    >
                      <div className="flex justify-between">
                        <div className="h-4 bg-border rounded w-24" />
                        <div className="h-4 bg-border rounded w-10" />
                      </div>
                      <div className="h-4 bg-border rounded w-3/4" />
                      <div className="h-3 bg-border rounded w-1/2" />
                      <div className="pt-2.5 border-t border-border space-y-1.5">
                        <div className="h-3 bg-border rounded w-2/3" />
                        <div className="h-3 bg-border rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : businesses.length > 0 ? (
                <>
                  {viewMode === 'map' ? (
                    <div className="space-y-4">
                      <BusinessMap
                        businesses={businesses}
                        selectedBusiness={selectedBusiness}
                        onSelectBusiness={(b) => setSelectedBusiness(b)}
                        provinceName={selectedProvince}
                        districtName={selectedDistrict}
                        totalCount={totalCount}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {businesses.slice(0, 6).map((b) => (
                          <BusinessCard
                            key={b.id}
                            business={b}
                            onSelect={(biz) => setSelectedBusiness(biz)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {businesses.map((b) => (
                        <BusinessCard
                          key={b.id}
                          business={b}
                          onSelect={(biz) => setSelectedBusiness(biz)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-4">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-card bg-panel border border-border text-small font-medium text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Önceki</span>
                      </button>

                      <span className="text-small text-muted">
                        Sayfa <span className="text-foreground font-semibold">{page}</span> / {totalPages}
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-card bg-panel border border-border text-small font-medium text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Sonraki</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-panel rounded-card border border-border space-y-2">
                  <Building2 className="w-10 h-10 text-muted/40 mx-auto" />
                  <h3 className="text-[14px] font-semibold text-foreground">Filtrelere uygun işletme bulunamadı</h3>
                  <p className="text-small text-muted max-w-sm mx-auto">
                    Arama kriterlerinizi esneterek veya il/kategori filtresini temizleyerek tekrar deneyin.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-display text-foreground">Sektör ve Kategori Taksonomisi</h2>
              <p className="text-body text-muted mt-1">
                LeadTR veritabanındaki 64 sektör ve alt kategorinin hiyerarşik dağılımı.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  title: 'Sağlık & Medikal',
                  count: 11,
                  subs: ['Diş Hekimi', 'Diş Kliniği', 'Ortodonti', 'Eczane', 'Hastane', 'Veteriner'],
                },
                {
                  title: 'Hukuk & Danışmanlık',
                  count: 5,
                  subs: ['Avukat', 'Hukuk Bürosu', 'Noter', 'Arabulucu'],
                },
                {
                  title: 'Otomotiv & Servis',
                  count: 7,
                  subs: ['Oto Servis', 'Lastikçi', 'Oto Ekspertiz', 'Oto Yıkama', 'Oto Galeri'],
                },
                {
                  title: 'Güzellik & Kişisel Bakım',
                  count: 6,
                  subs: ['Güzellik Merkezi', 'Kuaför', 'Berber', 'Spa & Hamam', 'Nail Art'],
                },
                {
                  title: 'Eğitim & Kurs',
                  count: 6,
                  subs: ['Özel Okul', 'Dershane / Kurs', 'Dil Okulu', 'Kreş', 'Üniversite'],
                },
                {
                  title: 'Yeme & İçme',
                  count: 6,
                  subs: ['Restoran', 'Kafe', 'Fast Food', 'Pastane', 'Fırıncılık'],
                },
                {
                  title: 'Konaklama & Turizm',
                  count: 5,
                  subs: ['Otel', 'Butik Otel', 'Pansiyon', 'Apart Otel'],
                },
                {
                  title: 'Gayrimenkul & İnşaat',
                  count: 5,
                  subs: ['Emlak Ofisi', 'İnşaat Firması', 'Mimarlık Ofisi'],
                },
                {
                  title: 'Spor & Fitness',
                  count: 4,
                  subs: ['Spor Salonu', 'Pilates / Yoga', 'Yüzme Havuzu'],
                },
              ].map((cat, i) => (
                <div key={i} className="bg-panel p-4 rounded-card border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-semibold text-foreground">{cat.title}</h3>
                    <span className="text-small text-muted">
                      {cat.count} alt dal
                    </span>
                  </div>
                  <ul className="text-small text-muted space-y-1">
                    {cat.subs.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-accent" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Developer API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-display text-foreground">Geliştirici API</h2>
              <p className="text-body text-muted mt-1">
                Yüksek hızlı B2B veri arama, zenginleştirme ve ihracat uç noktaları.
              </p>
            </div>

            <div className="bg-panel p-5 rounded-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-small font-semibold bg-positive/10 text-positive border border-positive/25 rounded-card font-mono">
                  GET /api/v1/businesses
                </span>
                <span className="text-small text-muted font-mono">60 req/min</span>
              </div>
              <p className="text-body text-muted">
                Türkiye genelinde kriterlere göre işletme sorgular, koordinatları ve skorları döndürür.
              </p>
              <div className="p-3 rounded-card bg-surface font-mono text-small text-accent overflow-x-auto border border-border">
                <code>
                  curl -X GET &apos;http://localhost:4000/api/v1/businesses?province=istanbul&category=hastane&minLeadScore=80&limit=10&apos; \<br />
                  &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos;
                </code>
              </div>
            </div>

            <div className="bg-panel p-5 rounded-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-small font-semibold bg-accent-muted text-accent border border-accent/25 rounded-card font-mono">
                  GET /api/v1/businesses/:id
                </span>
                <span className="text-small text-muted font-mono">Detay</span>
              </div>
              <p className="text-body text-muted">
                Tek bir işletmenin koordinatları, doğrulanmış iletişim kanalları ve kaynak geçmişini getirir.
              </p>
              <div className="p-3 rounded-card bg-surface font-mono text-small text-accent overflow-x-auto border border-border">
                <code>
                  curl -X GET &apos;http://localhost:4000/api/v1/businesses/b1-acibadem-maslak&apos; \<br />
                  &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos;
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="max-w-xl space-y-1">
              <h2 className="text-display text-foreground">Abonelik Planları</h2>
              <p className="text-body text-muted">
                İhtiyacınıza uygun veri paketini seçin, API veya Excel formatında kullanmaya başlayın.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  name: 'Starter',
                  price: '499 ₺',
                  credits: '1.000 Kredi / ay',
                  features: [
                    '1.000 Firma Dışa Aktarma',
                    '81 İl Kapsamı',
                    'Temel İletişim Bilgileri',
                    'CSV İndirme',
                    'API Erişimi (60 req/dk)',
                  ],
                  badge: 'Giriş',
                },
                {
                  name: 'Pro',
                  price: '2.499 ₺',
                  credits: '10.000 Kredi / ay',
                  features: [
                    '10.000 Firma Dışa Aktarma',
                    'Gelişmiş Lead Skorlaması',
                    'Mekânsal Filtreler',
                    'Excel & JSONL Desteği',
                    'API Erişimi (300 req/dk)',
                    'Öncelikli Destek',
                  ],
                  badge: 'Önerilen',
                  highlight: true,
                },
                {
                  name: 'Agency',
                  price: '7.500 ₺',
                  credits: '50.000 Kredi / ay',
                  features: [
                    '50.000 Firma Dışa Aktarma',
                    'Sınırsız Filtre Kombinasyonu',
                    'Web Crawler Zenginleştirmesi',
                    'Webhooks & Bildirimler',
                    'API Erişimi (1.000 req/dk)',
                    'Özel Müşteri Temsilcisi',
                  ],
                  badge: 'Kurumsal',
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`bg-panel p-5 sm:p-6 rounded-card border flex flex-col justify-between ${
                    plan.highlight
                      ? 'border-accent'
                      : 'border-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-small font-medium px-2 py-0.5 rounded-card ${
                        plan.highlight
                          ? 'bg-accent-muted text-accent'
                          : 'bg-surface text-muted'
                      }`}>
                        {plan.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[18px] font-bold text-foreground">{plan.name}</h3>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-[28px] font-bold text-foreground">{plan.price}</span>
                        <span className="text-small text-muted">/ ay</span>
                      </div>
                      <p className="text-small text-accent font-medium mt-0.5">{plan.credits}</p>
                    </div>

                    <ul className="space-y-1.5 text-small text-muted pt-3 border-t border-border">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-accent" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    className={`mt-5 w-full py-2 rounded-card font-semibold text-[13px] transition-colors ${
                      plan.highlight
                        ? 'bg-accent hover:bg-accent-hover text-white'
                        : 'bg-surface hover:bg-panel-hover border border-border text-foreground'
                    }`}
                  >
                    Planı Seç
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Selected Business Modal */}
      {selectedBusiness && (
        <BusinessModal
          business={selectedBusiness}
          onClose={() => setSelectedBusiness(null)}
          onBusinessUpdated={(updated) => {
            setSelectedBusiness(updated);
            setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          }}
        />
      )}

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          filterSummary={selectedProvince ? `${selectedProvince.toUpperCase()} İşletmeleri` : 'Tüm Türkiye'}
          totalAvailable={totalCount}
          filters={{
            query: searchQuery,
            province: selectedProvince,
            district: selectedDistrict,
            categorySlug: selectedCategory,
            minLeadScore: minLeadScore,
            hasPhoneOnly: hasPhoneOnly,
            onlyMobilePhone: onlyMobilePhone,
            urgentLeadOnly: urgentLeadOnly,
            hasWebsiteOnly: hasWebsiteOnly,
            hasNoWebsiteOnly: hasNoWebsiteOnly,
            sortBy: sortBy,
          }}
        />
      )}
    </div>
  );
}
