'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { BusinessDTO } from '@leadtr/types';
import { MapPin, Layers, ExternalLink, Navigation, Phone, MessageCircle, Maximize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface BusinessMapProps {
  businesses: BusinessDTO[];
  selectedBusiness?: BusinessDTO | null;
  onSelectBusiness?: (b: BusinessDTO) => void;
  provinceName?: string;
  districtName?: string;
  totalCount?: number;
}

export const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  selectedBusiness,
  onSelectBusiness,
  provinceName,
  districtName,
  totalCount,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const [totalMapped, setTotalMapped] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      (window as any).L = L;
      await import('leaflet.markercluster');

      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize base map once
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          center: [39.0, 35.2], // Center of Turkey
          zoom: 6,
          zoomControl: true,
          preferCanvas: true,
        });

        // 100% Free, High-Resolution Dark Basemap (ESRI World Dark Gray - Zero Watermark, No API Key Required)
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          {
            attribution: '&copy; Esri, HERE, Garmin &copy; OpenStreetMap contributors',
            maxZoom: 16,
          }
        ).addTo(mapInstanceRef.current);

        // High-contrast City & District Labels Layer
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 16,
          }
        ).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      // Initialize or reset Cluster Group
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        map.removeLayer(clusterGroupRef.current);
      }

      // Create Custom High-Tech Dark Theme Cluster Group
      const clusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        animate: true,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let ringColor = '#3b82f6';
          let glowColor = 'rgba(59, 130, 246, 0.45)';
          let size = 36;

          if (count >= 100) {
            ringColor = '#f59e0b'; // Amber gold for mega clusters
            glowColor = 'rgba(245, 158, 11, 0.5)';
            size = 46;
          } else if (count >= 25) {
            ringColor = '#10b981'; // Emerald for medium clusters
            glowColor = 'rgba(16, 185, 129, 0.45)';
            size = 40;
          }

          const label = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;

          return L.divIcon({
            html: `
              <div style="
                width: ${size}px;
                height: ${size}px;
                background: rgba(18, 20, 23, 0.94);
                border: 2px solid ${ringColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 14px ${glowColor}, 0 4px 10px rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
                cursor: pointer;
              ">
                <span style="
                  font-family: Inter, -apple-system, sans-serif;
                  font-weight: 700;
                  font-size: ${size > 40 ? '13px' : '11px'};
                  color: #ffffff;
                ">${label}</span>
              </div>
            `,
            className: 'leadtr-cluster-bubble',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });

      clusterGroupRef.current = clusterGroup;

      // Custom Single Pin Icon
      const customPin = L.divIcon({
        className: 'leadtr-single-pin',
        html: `
          <div style="
            background: #3b82f6;
            width: 22px;
            height: 22px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="
              width: 5px;
              height: 5px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -22],
      });

      const bounds: [number, number][] = [];
      let validCount = 0;

      businesses.forEach((b) => {
        const loc = b.locations?.[0];
        if (loc?.latitude && loc?.longitude) {
          const lat = loc.latitude;
          const lng = loc.longitude;
          bounds.push([lat, lng]);
          validCount++;

          const rawPhone = b.phones?.[0]?.normalizedPhone || b.phones?.[0]?.originalPhone || '';
          const cleanPhone = rawPhone.replace(/\D/g, '');
          const isMobile = cleanPhone.startsWith('905') || cleanPhone.startsWith('05') || (cleanPhone.length === 10 && cleanPhone.startsWith('5'));
          const waNum = isMobile ? (cleanPhone.startsWith('0') ? '9' + cleanPhone : (!cleanPhone.startsWith('90') ? '90' + cleanPhone : cleanPhone)) : null;

          const gSearch = encodeURIComponent(`${b.canonicalName} ${loc.district || ''} ${loc.province || ''}`);
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${gSearch}&center=${lat},${lng}`;

          // Dark Theme Leaflet Popup
          const popupHtml = `
            <div style="font-family: Inter, sans-serif; min-width: 210px; padding: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 10px; font-weight: 600; background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); padding: 2px 6px; border-radius: 4px;">
                  ${b.category?.name || 'Ticari İşletme'}
                </span>
                <span style="font-size: 11px; font-weight: 700; color: #fbbf24;">
                  ★ ${Math.round(b.scores?.leadScore ?? 0)}
                </span>
              </div>
              <h4 style="font-size: 13px; font-weight: 600; color: #f3f4f6; margin: 4px 0 2px 0; line-height: 1.3;">
                ${b.canonicalName}
              </h4>
              <p style="font-size: 11px; color: #9ca3af; margin-bottom: 8px;">
                📍 ${loc.district ? loc.district + ', ' : ''}${loc.province || 'Türkiye'}
              </p>
              ${rawPhone ? `
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 11px; font-family: monospace; color: #34d399; font-weight: 600;">
                    📞 ${rawPhone}
                  </span>
                </div>
              ` : ''}
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px;">
                ${waNum ? `
                  <a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer" style="
                    display: inline-flex;
                    align-items: center;
                    gap: 3px;
                    background: #10b981;
                    color: #ffffff;
                    font-size: 10px;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 4px;
                    text-decoration: none;
                  ">
                    WhatsApp ↗
                  </a>
                ` : ''}
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                  background: #2a2e36;
                  color: #e5e7eb;
                  font-size: 10px;
                  font-weight: 500;
                  padding: 4px 8px;
                  border-radius: 4px;
                  text-decoration: none;
                ">
                  Harita ↗
                </a>
              </div>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: customPin });
          marker.bindPopup(popupHtml);

          if (onSelectBusiness) {
            marker.on('popupopen', () => {
              // Can attach custom listeners or select
            });
          }

          clusterGroup.addLayer(marker);
        }
      });

      map.addLayer(clusterGroup);
      setTotalMapped(validCount);

      // Auto-fit to active bounds or reset to Turkey
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } else {
        map.setView([39.0, 35.2], 6);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [businesses]);

  const handleResetZoom = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([39.0, 35.2], 6);
    }
  };

  return (
    <div className="relative w-full h-[580px] rounded-card overflow-hidden border border-border bg-panel shadow-sm">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Cluster HUD: Information & Density Indicator */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-card bg-surface/90 backdrop-blur-md border border-border text-small text-foreground shadow-md pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="font-semibold text-accent">Canlı Kümeleme:</span>
          <span className="font-mono tabular-nums font-bold text-foreground">
            {totalMapped.toLocaleString('tr-TR')}
          </span>
          {totalCount && totalCount > totalMapped ? (
            <span className="text-muted font-normal">
              / {totalCount.toLocaleString('tr-TR')}
            </span>
          ) : null}
          <span className="text-muted">nokta haritalandı</span>
        </div>
        {provinceName && (
          <>
            <span className="text-border">|</span>
            <span className="text-muted text-[11px] font-medium">
              {districtName ? `${districtName}, ` : ''}{provinceName}
            </span>
          </>
        )}
      </div>

      {/* Quick Action: Reset Turkey View */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleResetZoom}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-card bg-surface/90 hover:bg-surface border border-border text-[11px] font-medium text-foreground transition-all shadow-md active:scale-95"
          title="Tüm Türkiye genel görünümüne dön"
        >
          <Maximize2 className="w-3 h-3 text-accent" />
          <span>Türkiye Geneli</span>
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-surface/85 backdrop-blur-sm border border-border/80 text-[10px] text-muted pointer-events-none">
        💡 Kümelerin üzerine tıklayarak veya fare tekerleğiyle yaklaşarak alt işletmeleri açabilirsiniz.
      </div>
    </div>
  );
};
