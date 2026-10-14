import React, { useState } from 'react';
import { Trees, Eye, EyeOff, Layers, Compass, Flame, ChevronDown, ChevronRight, X } from 'lucide-react';
import { amazonRainforestVegetationManager, ForestStats } from '../../cesium/amazonRainforestVegetation';
import { CesiumViewerManager } from '../../cesium/viewer';
import { AMAZON_STUDY_REGION } from '../../config/studyRegion';

interface ForestInspectionPanelProps {
  forestStats: ForestStats;
  onUpdateStats: (stats: ForestStats) => void;
  isOpen: boolean;
  onClose: () => void;
  isSimulatedFireActive?: boolean;
  currentIgnitionLat?: number;
  currentIgnitionLon?: number;
}

export const ForestInspectionPanel: React.FC<ForestInspectionPanelProps> = ({
  forestStats,
  onUpdateStats,
  isOpen,
  onClose,
  isSimulatedFireActive = false,
  currentIgnitionLat,
  currentIgnitionLon,
}) => {
  const [showScientificDetails, setShowScientificDetails] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleToggleVisibility = () => {
    const next = !forestStats.isVegetationVisible;
    amazonRainforestVegetationManager.setVisible(next);
    onUpdateStats(amazonRainforestVegetationManager.getForestStats());
  };

  const handleSetDensity = (density: 'HIGH' | 'MEDIUM' | 'LOW') => {
    const updated = amazonRainforestVegetationManager.setDensity(density);
    onUpdateStats(updated);
  };

  const handleFlyToCanopy = () => {
    const lat = currentIgnitionLat || AMAZON_STUDY_REGION.center.latitude;
    const lon = currentIgnitionLon || AMAZON_STUDY_REGION.center.longitude;
    CesiumViewerManager.getInstance().flyToCanopyLevel(lat, lon);
  };

  const handleFlyToFire = () => {
    if (currentIgnitionLat && currentIgnitionLon) {
      CesiumViewerManager.getInstance().flyToFireFront(currentIgnitionLat, currentIgnitionLon);
    }
  };

  return (
    <aside
      aria-label="3D Rainforest Vegetation Panel"
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '76px',
        right: '20px',
        width: '360px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 160px)',
        overflowY: 'auto',
        backgroundColor: 'var(--bg-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-floating)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        zIndex: 48,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'var(--accent-forest-subtle)',
              border: '1px solid var(--accent-forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trees size={15} color="var(--accent-forest)" />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              3D Amazon Rainforest
            </h3>
            <span style={{ fontSize: '0.64rem', color: 'var(--text-secondary)' }}>
              Geographically Grounded Digital Twin
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="glass-button"
          style={{ width: '22px', height: '22px', padding: 0, color: 'var(--text-secondary)' }}
          title="Close panel"
        >
          <X size={13} />
        </button>
      </div>

      {/* Main Controls: Visibility, Density, & Views */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'var(--bg-surface-secondary)',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            3D Vegetation Layer
          </span>
          <button
            onClick={handleToggleVisibility}
            className="glass-button"
            style={{
              padding: '3px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              gap: '4px',
              color: forestStats.isVegetationVisible ? 'var(--status-success)' : 'var(--text-secondary)',
              borderColor: forestStats.isVegetationVisible ? 'var(--status-success-border)' : 'var(--border-color)',
              background: forestStats.isVegetationVisible ? 'var(--status-success-bg)' : 'var(--bg-surface)',
            }}
          >
            {forestStats.isVegetationVisible ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{forestStats.isVegetationVisible ? 'Visible (60 FPS)' : 'Hidden'}</span>
          </button>
        </div>

        {/* Density Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Canopy Density:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['HIGH', 'MEDIUM', 'LOW'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleSetDensity(lvl)}
                style={{
                  background:
                    forestStats.totalTrees >= (lvl === 'HIGH' ? 4500 : lvl === 'MEDIUM' ? 2500 : 1000) &&
                    forestStats.totalTrees <= (lvl === 'HIGH' ? 6000 : lvl === 'MEDIUM' ? 3500 : 2000)
                      ? 'var(--accent-forest-subtle)'
                      : 'var(--bg-surface)',
                  border:
                    forestStats.totalTrees >= (lvl === 'HIGH' ? 4500 : lvl === 'MEDIUM' ? 2500 : 1000) &&
                    forestStats.totalTrees <= (lvl === 'HIGH' ? 6000 : lvl === 'MEDIUM' ? 3500 : 2000)
                      ? '1px solid var(--accent-forest)'
                      : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Cinematic Camera Views */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
          <button
            onClick={handleFlyToCanopy}
            className="glass-button"
            style={{
              padding: '5px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              gap: '5px',
              justifyContent: 'center',
              color: 'var(--accent-forest)',
              borderColor: 'var(--accent-forest-border)',
            }}
            title="Fly camera down to 3D tree crown canopy level"
          >
            <Compass size={12} />
            <span>Canopy Walk</span>
          </button>

          {isSimulatedFireActive && currentIgnitionLat ? (
            <button
              onClick={handleFlyToFire}
              className="glass-button"
              style={{
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                gap: '5px',
                justifyContent: 'center',
                color: 'var(--color-fire)',
                borderColor: 'var(--color-fire)',
                background: 'rgba(239, 68, 68, 0.08)',
              }}
              title="Focus camera directly on the active 3D flame front"
            >
              <Flame size={12} />
              <span>Fire Front</span>
            </button>
          ) : (
            <button
              onClick={() => CesiumViewerManager.getInstance().flyToAmazonRegion(2.5)}
              className="glass-button"
              style={{
                padding: '5px 8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                gap: '5px',
                justifyContent: 'center',
                color: 'var(--accent-blue)',
              }}
              title="Regional perspective over Rio Negro basin"
            >
              <Layers size={12} />
              <span>Basin View</span>
            </button>
          )}
        </div>
      </div>

      {/* Canopy Composition & Multi-Tier Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface-secondary)',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block' }}>
            3D Trees Rendered
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-forest)' }}>
            {forestStats.totalTrees.toLocaleString()}
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-secondary)',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', display: 'block' }}>
            Canopy Coverage
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ~{forestStats.canopyAreaHectares} ha
          </span>
        </div>
      </div>

      {/* Multi-Tier Botanical Breakdown */}
      <div
        style={{
          background: 'var(--bg-surface-secondary)',
          borderRadius: '6px',
          padding: '8px 10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Canopy Stratification (Amazon Rainforest)
        </span>

        {/* Emergent Layer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
            <span>Emergent Giants (35–48m)</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {forestStats.emergentCount} ({Math.round((forestStats.emergentCount / (forestStats.totalTrees || 1)) * 100)}%)
          </span>
        </div>

        {/* Upper Canopy */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#15803D' }} />
            <span>Dense Canopy (22–32m)</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {forestStats.canopyCount} ({Math.round((forestStats.canopyCount / (forestStats.totalTrees || 1)) * 100)}%)
          </span>
        </div>

        {/* Understory Palms */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2E7D32' }} />
            <span>Understory & Palms (12–18m)</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {forestStats.understoryCount} ({Math.round((forestStats.understoryCount / (forestStats.totalTrees || 1)) * 100)}%)
          </span>
        </div>

        {/* Riverside */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#81C784' }} />
            <span>Riverbank Vegetation (4–8m)</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {forestStats.riversideCount} ({Math.round((forestStats.riversideCount / (forestStats.totalTrees || 1)) * 100)}%)
          </span>
        </div>
      </div>

      {/* Live Wildfire Impact (if active fire exists) */}
      {isSimulatedFireActive && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.06)',
            borderRadius: '6px',
            padding: '8px 10px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Flame size={12} color="var(--color-fire)" />
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--color-fire)', textTransform: 'uppercase' }}>
              Dynamic Wildfire Impact on Vegetation
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '2px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', display: 'block' }}>HEALTHY</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16A34A' }}>
                {forestStats.healthyCount}
              </span>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', display: 'block' }}>BURNING</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#EA580C' }}>
                {forestStats.burningCount}
              </span>
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '5px 6px', borderRadius: '4px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-secondary)', display: 'block' }}>SCORCHED</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#71717A' }}>
                {forestStats.scorchedCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scientific Data Provenance & Methodology */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
        <button
          onClick={() => setShowScientificDetails((prev) => !prev)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.66rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 0',
          }}
        >
          {showScientificDetails ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          <span>Scientific Grounding & Data Sources</span>
        </button>

        {showScientificDetails && (
          <div
            style={{
              marginTop: '6px',
              background: 'var(--bg-surface-secondary)',
              borderRadius: '6px',
              padding: '8px 10px',
              fontSize: '0.64rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <strong>Terrain DEM:</strong> Cesium WGS84 World Terrain + Copernicus DEM 90m
            </div>
            <div>
              <strong>Land Cover:</strong> ESA WorldCover 2021 v200 (10m Resolution)
            </div>
            <div>
              <strong>Hydrography:</strong> Rio Negro & Amazon River water barrier exclusion
            </div>
            <div>
              <strong>Vegetation Modeling:</strong> Procedural multi-tier botanical geometry clamped to genuine terrain elevation.
            </div>
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
              Note: 3D individual tree geometries are procedurally generated to reflect observed forest-cover distributions and are not individually surveyed trees.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
