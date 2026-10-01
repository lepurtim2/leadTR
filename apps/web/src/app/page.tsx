'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Phone,
  Globe,
  ChevronDown,
  Building2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  LayoutGrid,
  Map as MapIcon,
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
      <div className="w-full h-[520px] rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Mekânsal Harita Yükleniyor...</span>
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
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [hasNoWebsiteOnly, setHasNoWebsiteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'leadScore' | 'name' | 'createdAt'>('leadScore');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Live Data States
  const [businesses, setBusinesses] = useState<BusinessDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [overallTotalCount, setOverallTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessDTO | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch overall total count once on mount
  useEffect(() => {
    async function fetchOverallCount() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/businesses/count`);
        if (res.ok) {
          const json = await res.json();
          setOverallTotalCount(json.count ?? 0);
        }
      } catch (err) {
        console.warn('Could not fetch overall business count:', err);
      }
    }
    fetchOverallCount();
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
      if (hasWebsiteOnly) params.set('hasWebsite', 'true');
      if (hasNoWebsiteOnly) params.set('hasNoWebsite', 'true');
      params.set('sortBy', sortBy);
      params.set('page', String(page));
      params.set('limit', '18');

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
  }, [searchQuery, selectedProvince, selectedDistrict, selectedCategory, minLeadScore, hasPhoneOnly, hasWebsiteOnly, hasNoWebsiteOnly, sortBy, page]);

  // Trigger search on filter changes (resetting page to 1 when filters change)
  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Search Tab View */}
        {activeTab === 'search' && (
          <>
            {/* Hero Section */}
            <div className="relative text-center py-6 sm:py-10 max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>PostgreSQL 17 + PostGIS Aktif • 100% Doğrulanmış Gerçek Veri</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Türkiye&apos;nin Doğrulanmış{' '}
                <span className="text-gradient">İşletme ve Lead Platformu</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-400 font-medium">
                81 ildeki işletmeleri harita koordinatları, doğrulanmış iletişim kanalları, dijital varlık ve lead
                skorlarıyla anında keşfedin ve dışa aktarın.
              </p>
            </div>

            {/* Platform Metrics Ribbon with live Supabase counts */}
            <StatsRibbon
              totalCount={overallTotalCount > 0 ? overallTotalCount : totalCount}
              provinceCount={81}
              categoryCount={64}
            />

            {/* Search and Filters Hub */}
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              {/* Primary Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Text query input */}
                <div className="md:col-span-4 relative">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                    placeholder="Firma veya anahtar kelime... (Örn: Diş, Pilates)"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                {/* Province Dropdown */}
                <div className="md:col-span-3 relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedProvince}
                    onChange={(e) => {
                      handleFilterChange(setSelectedProvince, e.target.value);
                      setSelectedDistrict('');
                    }}
                    className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Tüm Türkiye (81 İl)</option>
                    {TURKISH_PROVINCES.map((p) => (
                      <option key={p.plate} value={p.normalized}>
                        {p.plate.toString().padStart(2, '0')} - {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* District Dropdown */}
                <div className="md:col-span-2 relative">
                  <select
                    value={selectedDistrict}
                    onChange={(e) => handleFilterChange(setSelectedDistrict, e.target.value)}
                    disabled={!selectedProvince}
                    className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Category Dropdown */}
                <div className="md:col-span-3 relative">
                  <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Tüm Kategoriler</option>
                    <option value="hastane">Hastane</option>
                    <option value="eczane">Eczane</option>
                    <option value="dis-klinigi">Diş Kliniği</option>
                    <option value="klinik">Klinik & Poliklinik</option>
                    <option value="veteriner">Veteriner Kliniği</option>
                    <option value="optik">Optik & Gözlük</option>
                    <option value="hukuk-burosu">Hukuk Bürosu & Avukat</option>
                    <option value="noter">Noter</option>
                    <option value="muhasebe">Mali Müşavir & Muhasebe</option>
                    <option value="finans">Finans & Banka</option>
                    <option value="sigorta">Sigorta Acentesi</option>
                    <option value="emlak-ofisi">Emlak Ofisi & Gayrimenkul</option>
                    <option value="otel">Otel & Konaklama</option>
                    <option value="restoran">Restoran & Lokanta</option>
                    <option value="kafe">Kafe & Kahve</option>
                    <option value="firincilik">Fırın & Pastane</option>
                    <option value="oto-servis">Oto Servis & Tamir</option>
                    <option value="oto-yikama">Oto Yıkama</option>
                    <option value="kuafor">Kuaför & Berber</option>
                    <option value="guzellik-merkezi">Güzellik Merkezi</option>
                    <option value="spor-salonu">Spor Salonu & Fitness</option>
                    <option value="kuyumcu">Kuyumcu & Mücevher</option>
                    <option value="supermarket">Market & Süpermarket</option>
                    <option value="nalburiye">Nalburiye & Hırdavat</option>
                    <option value="kargo">Kargo & Lojistik</option>
                    <option value="akaryakit">Akaryakıt & Petrol</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Advanced Filter Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={hasPhoneOnly}
                      onChange={(e) => handleFilterChange(setHasPhoneOnly, e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sadece Doğrulanmış Telefonu Olanlar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                    <input
                      type="checkbox"
                      checked={hasWebsiteOnly}
                      onChange={(e) => {
                        if (e.target.checked) setHasNoWebsiteOnly(false);
                        handleFilterChange(setHasWebsiteOnly, e.target.checked);
                      }}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Web Sitesi Olanlar</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-amber-300">
                    <input
                      type="checkbox"
                      checked={hasNoWebsiteOnly}
                      onChange={(e) => {
                        if (e.target.checked) setHasWebsiteOnly(false);
                        handleFilterChange(setHasNoWebsiteOnly, e.target.checked);
                      }}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <Globe className="w-3.5 h-3.5 text-amber-400 opacity-70" />
                    <span className="text-amber-200/90 font-medium">Web Sitesi Olmayanlar (Lead Adayı)</span>
                  </label>
                </div>

                {/* Score Slider & Sort */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Min. Lead Skoru:</span>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="10"
                      value={minLeadScore}
                      onChange={(e) => handleFilterChange(setMinLeadScore, Number(e.target.value))}
                      className="w-20 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="font-mono text-cyan-300 font-bold">{minLeadScore}+</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Sırala:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="leadScore">Lead Skoru</option>
                      <option value="name">İsim (A-Z)</option>
                      <option value="createdAt">Eklenme Tarihi</option>
                    </select>
                  </div>

                  <button
                    onClick={() => fetchBusinesses()}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Yenile"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Doğrulanmış İşletme Kayıtları</h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-cyan-400 border border-slate-700 font-mono">
                    {totalCount} Sonuç
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Mode Toggle: List vs Map */}
                  <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        viewMode === 'list'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Liste</span>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        viewMode === 'map'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span>Harita (Mekânsal)</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Dışa Aktar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Loading Skeleton */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="glass-panel p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 space-y-3 animate-pulse"
                    >
                      <div className="flex justify-between">
                        <div className="h-4 bg-slate-800 rounded w-24" />
                        <div className="h-5 bg-slate-800 rounded w-12" />
                      </div>
                      <div className="h-5 bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="h-3 bg-slate-800 rounded w-2/3" />
                        <div className="h-3 bg-slate-800 rounded w-1/2" />
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
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {businesses.map((b) => (
                        <BusinessCard
                          key={b.id}
                          business={b}
                          onSelect={(biz) => setSelectedBusiness(biz)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Önceki</span>
                      </button>

                      <span className="text-xs text-slate-400 font-mono">
                        Sayfa <span className="text-white font-bold">{page}</span> / {totalPages}
                      </span>

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Sonraki</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-panel text-center py-16 rounded-2xl border border-slate-800 space-y-3">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
                  <h3 className="text-base font-semibold text-white">Filtrelere Uygun İşletme Bulunamadı</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Arama kriterlerinizi esneterek veya il/kategori filtresini temizleyerek tekrar deneyin.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">İşletme Sektör ve Kategori Taksonomisi</h2>
              <p className="text-xs text-slate-400 mt-1">
                LeadTR veritabanındaki 64 sektör ve alt kategorinin hiyerarşik dağılımı.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div key={i} className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{cat.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-500/10 text-cyan-400 font-mono">
                      {cat.count} Alt Dal
                    </span>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    {cat.subs.map((s, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
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
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">LeadTR Geliştirici API (REST / JSON)</h2>
              <p className="text-xs text-slate-400 mt-1">
                Yüksek hızlı B2B veri arama, zenginleştirme ve ihracat uç noktaları.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">
                  GET /api/v1/businesses
                </span>
                <span className="text-xs text-slate-500 font-mono">Rate Limit: 60 req/min</span>
              </div>
              <p className="text-xs text-slate-300">
                Türkiye genelinde kriterlere göre işletme sorgular, koordinatları ve skorları döndürür.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-cyan-300 overflow-x-auto border border-slate-800">
                <code>
                  curl -X GET &apos;http://localhost:4000/api/v1/businesses?province=istanbul&category=hastane&minLeadScore=80&limit=10&apos; \<br />
                  &nbsp;&nbsp;-H &apos;Authorization: Bearer YOUR_API_KEY&apos;
                </code>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg">
                  GET /api/v1/businesses/:id
                </span>
                <span className="text-xs text-slate-500 font-mono">Mekânsal & Provenance Detayı</span>
              </div>
              <p className="text-xs text-slate-300">
                Tek bir işletmenin PostGIS koordinatları, doğrulanmış iletişim kanalları ve kaynak geçmişini getirir.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-cyan-300 overflow-x-auto border border-slate-800">
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
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-3xl font-extrabold text-white">Şeffaf Kredi ve Abonelik Planları</h2>
              <p className="text-xs text-slate-400">
                İhtiyacınıza uygun veri paketini seçin, API veya Excel formatında hemen kullanmaya başlayın.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    'PostGIS Mekânsal Filtreler',
                    'Excel & JSONL Desteği',
                    'API Erişimi (300 req/dk)',
                    'Öncelikli Destek',
                  ],
                  badge: 'En Popüler',
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
                    'Webhooks & Değişiklik Bildirimleri',
                    'API Erişimi (1.000 req/dk)',
                    'Özel Müşteri Temsilcisi',
                  ],
                  badge: 'Kurumsal',
                },
              ].map((plan, i) => (
                <div
                  key={i}
                  className={`glass-panel p-6 sm:p-8 rounded-2xl border transition-all flex flex-col justify-between ${
                    plan.highlight
                      ? 'border-cyan-500/50 bg-slate-900/80 shadow-2xl shadow-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {plan.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                        <span className="text-xs text-slate-400">/ ay</span>
                      </div>
                      <p className="text-xs text-cyan-400 font-semibold mt-1 font-mono">{plan.credits}</p>
                    </div>

                    <ul className="space-y-2 text-xs text-slate-300 pt-4 border-t border-slate-800">
                      {plan.features.map((f, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    className={`mt-6 w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-cyan-500/25'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
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
            hasWebsiteOnly: hasWebsiteOnly,
            hasNoWebsiteOnly: hasNoWebsiteOnly,
            sortBy: sortBy,
          }}
        />
      )}
    </div>
  );
}
