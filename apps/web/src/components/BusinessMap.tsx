'use client';

import React, { useEffect, useRef } from 'react';
import type { BusinessDTO } from '@leadtr/types';
import { ExternalLink, MapPin, Phone, Star } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface BusinessMapProps {
  businesses: BusinessDTO[];
  selectedBusiness?: BusinessDTO | null;
  onSelectBusiness?: (b: BusinessDTO) => void;
}

export const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  selectedBusiness,
  onSelectBusiness,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        // Turkey center coordinates
        mapInstanceRef.current = L.map(mapContainerRef.current, {
          center: [39.92, 32.85],
          zoom: 6,
          zoomControl: true,
        });

        // High performance dark-matter tiles matching our luxury dark theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds: [number, number][] = [];

      // Custom Pin Icon
      const customPin = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div style="
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            width: 28px;
            height: 28px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(6, 182, 212, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: #ffffff;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });

      businesses.forEach((b) => {
        const loc = b.locations?.[0];
        if (loc?.latitude && loc?.longitude) {
          const lat = loc.latitude;
          const lng = loc.longitude;
          bounds.push([lat, lng]);

          const queryParts = [b.canonicalName];
          if (loc.district) queryParts.push(loc.district);
          if (loc.province) queryParts.push(loc.province);
          const gSearch = encodeURIComponent(queryParts.join(' '));
          const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${gSearch}&center=${lat},${lng}`;
          const phone = b.phones?.[0]?.normalizedPhone || b.phones?.[0]?.originalPhone;

          const popupContent = document.createElement('div');
          popupContent.className = 'p-1 text-slate-900 font-sans';
          popupContent.innerHTML = `
            <div style="font-family: inherit; min-width: 200px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">
                  ${b.category?.name || 'İşletme'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #0284c7;">
                  ★ ${Math.round(b.scores?.leadScore ?? 0)}
                </span>
              </div>
              <h4 style="font-size: 13px; font-weight: bold; color: #0f172a; margin: 4px 0 2px 0; line-height: 1.2;">
                ${b.canonicalName}
              </h4>
              <p style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
                ${loc.district ? loc.district + ', ' : ''}${loc.province || 'Türkiye'}
              </p>
              ${phone ? `<p style="font-size: 11px; font-family: monospace; color: #059669; margin-bottom: 8px;">📞 ${phone}</p>` : ''}
              <div style="display: flex; gap: 6px; margin-top: 6px;">
                <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="
                  display: inline-flex;
                  align-items: center;
                  gap: 4px;
                  background: #f1f5f9;
                  color: #0284c7;
                  font-size: 10px;
                  font-weight: 600;
                  padding: 4px 8px;
                  border-radius: 6px;
                  text-decoration: none;
                ">
                  Google Maps ↗
                </a>
              </div>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon: customPin }).addTo(map);
          marker.bindPopup(popupContent);

          if (onSelectBusiness) {
            marker.on('click', () => {
              onSelectBusiness(b);
            });
          }

          markersRef.current.push(marker);
        }
      });

      // Fit bounds to display all points
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
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

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl glass-panel">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-xs text-slate-300 font-mono flex items-center gap-2 shadow-lg pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
        <span>Haritada {businesses.filter((b) => b.locations?.[0]?.latitude).length} Nokta</span>
      </div>
    </div>
  );
};
