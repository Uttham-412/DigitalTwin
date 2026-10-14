/**
 * LAND8FIRE — 3D AMAZON FOREST HEADER
 *
 * Slim, elegant navigation bar matching the top bar of the reference image:
 * - Left: Menu icon, Tree icon, "AMAZON FOREST | VIRTUAL ECOSYSTEM"
 * - Right: Daytime dropdown, Weather pill, Study Region dropdown, Profile/Info
 */

import React, { useState } from 'react';
import { Menu, Trees, Sun, Cloud, Compass, User, Globe, ChevronDown, Check } from 'lucide-react';
import { TimeOfDay } from '../../three/AmazonForestScene';

interface AmazonHeaderProps {
  timeOfDay: TimeOfDay;
  onSelectTimeOfDay: (time: TimeOfDay) => void;
  temperatureCelsius: number;
  viewMode: '3D_FOREST' | 'CESIUM_GLOBE';
  onToggleViewMode: (mode: '3D_FOREST' | 'CESIUM_GLOBE') => void;
  onOpenInfo: () => void;
}

export const AmazonHeader: React.FC<AmazonHeaderProps> = ({
  timeOfDay,
  onSelectTimeOfDay,
  temperatureCelsius,
  viewMode,
  onToggleViewMode,
  onOpenInfo,
}) => {
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  const timeLabels: Record<TimeOfDay, string> = {
    DAYTIME: 'Daytime',
    GOLDEN_HOUR: 'Golden Hour',
    DUSK: 'Dusk',
    OVERCAST: 'Overcast',
  };

  return (
    <header
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '52px',
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 50,
        color: '#1F2937',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Left: Brand / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onOpenInfo}
          title="Menu / Provenance"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#EAF5EC',
              border: '1px solid #C4E2CB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trees size={15} color="#166534" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#14532D',
              }}
            >
              AMAZON FOREST
            </span>
            <span style={{ color: '#9CA3AF', fontWeight: 300 }}>|</span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                color: '#4B5563',
              }}
            >
              VIRTUAL ECOSYSTEM
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls Matching Reference Image */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Daytime / Lighting Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsTimeDropdownOpen((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.80rem',
              color: '#374151',
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <Sun size={15} color="#D97706" />
            <span>{timeLabels[timeOfDay]}</span>
            <ChevronDown size={14} color="#6B7280" />
          </button>

          {isTimeDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E5E7EB',
                padding: '4px',
                minWidth: '140px',
                zIndex: 60,
              }}
            >
              {(Object.keys(timeLabels) as TimeOfDay[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onSelectTimeOfDay(mode);
                    setIsTimeDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: timeOfDay === mode ? '#F0FDF4' : 'transparent',
                    color: timeOfDay === mode ? '#166534' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: timeOfDay === mode ? 600 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{timeLabels[mode]}</span>
                  {timeOfDay === mode && <Check size={14} color="#166534" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Weather Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.80rem',
            color: '#374151',
            fontWeight: 500,
            padding: '4px 8px',
          }}
        >
          <Cloud size={16} color="#4B5563" />
          <span>{temperatureCelsius.toFixed(1)}°C</span>
        </div>

        {/* Study Region Selector */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsRegionDropdownOpen((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.80rem',
              color: '#374151',
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <Compass size={15} color="#166534" />
            <span>Study Region</span>
            <ChevronDown size={14} color="#6B7280" />
          </button>

          {isRegionDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E5E7EB',
                padding: '6px',
                minWidth: '220px',
                zIndex: 60,
              }}
            >
              <div
                style={{
                  padding: '8px 10px',
                  background: '#F0FDF4',
                  borderRadius: '6px',
                  border: '1px solid #DCFCE7',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#166534' }}>
                  Manaus & Anavilhanas Reserve
                </div>
                <div style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: '2px' }}>
                  -3.1190° S, -60.0217° W (6.55 km²)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3D Forest / Globe View Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#F3F4F6',
            borderRadius: '20px',
            padding: '2px',
            border: '1px solid #E5E7EB',
          }}
        >
          <button
            onClick={() => onToggleViewMode('3D_FOREST')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '18px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === '3D_FOREST' ? '#FFFFFF' : 'transparent',
              color: viewMode === '3D_FOREST' ? '#166534' : '#6B7280',
              boxShadow: viewMode === '3D_FOREST' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trees size={12} />
            <span>3D Forest</span>
          </button>

          <button
            onClick={() => onToggleViewMode('CESIUM_GLOBE')}
            style={{
              border: 'none',
              padding: '4px 10px',
              borderRadius: '18px',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: viewMode === 'CESIUM_GLOBE' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'CESIUM_GLOBE' ? '#166534' : '#6B7280',
              boxShadow: viewMode === 'CESIUM_GLOBE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Globe size={12} />
            <span>Regional Map</span>
          </button>
        </div>

        {/* User / Info Avatar Button */}
        <button
          onClick={onOpenInfo}
          title="Account / Project Information"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#4B5563',
          }}
        >
          <User size={16} />
        </button>
      </div>
    </header>
  );
};
