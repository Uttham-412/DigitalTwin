/**
 * LAND8FIRE — 3D CAMERA NAVIGATION TOOLBAR
 *
 * Discrete floating bottom pill toolbar allowing one-click camera transitions:
 * - Canopy Flyover (Default reference view)
 * - Ground Walk (First-person ground exploration among trunks & palms)
 * - River Rapids (Waterside perspective)
 * - Fire Front (Close inspection of the combustion perimeter)
 * - Regional Overview (High-altitude aerial map vantage)
 */

import React from 'react';
import { Eye, Home, Footprints, Waves, Flame, Globe2, RotateCcw } from 'lucide-react';
import { CameraPreset } from '../../three/AmazonForestScene';

interface CameraNavigationToolbarProps {
  activePreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  onReset: () => void;
}

export const CameraNavigationToolbar: React.FC<CameraNavigationToolbarProps> = ({
  activePreset,
  onSelectPreset,
  onReset,
}) => {
  const presets: Array<{ id: CameraPreset; label: string; icon: React.ReactNode }> = [
    { id: 'CANOPY_FLYOVER', label: 'Canopy Flyover', icon: <Eye size={14} /> },
    { id: 'SETTLEMENT', label: 'Settlement & Bridge', icon: <Home size={14} /> },
    { id: 'GROUND_WALK', label: 'Ground Walk', icon: <Footprints size={14} /> },
    { id: 'RIVER_RAPIDS', label: 'River Bank', icon: <Waves size={14} /> },
    { id: 'FIRE_FRONT', label: 'Fire Front', icon: <Flame size={14} /> },
    { id: 'REGIONAL_OVERVIEW', label: 'Overview', icon: <Globe2 size={14} /> },
  ];

  return (
    <nav
      aria-label="3D Viewpoint Navigation"
      style={{
        position: 'absolute',
        bottom: '22px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '30px',
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        zIndex: 40,
      }}
    >
      {presets.map((p) => {
        const isActive = activePreset === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelectPreset(p.id)}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              background: isActive ? '#166534' : 'transparent',
              color: isActive ? '#FFFFFF' : '#4B5563',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {p.icon}
            <span>{p.label}</span>
          </button>
        );
      })}

      <div style={{ width: '1px', height: '18px', background: '#E5E7EB', margin: '0 2px' }} />

      <button
        onClick={onReset}
        title="Reset Camera"
        style={{
          border: 'none',
          background: 'none',
          padding: '6px 8px',
          borderRadius: '50%',
          cursor: 'pointer',
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RotateCcw size={14} />
      </button>
    </nav>
  );
};
