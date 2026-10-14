/**
 * LAND8FIRE — AI EVIDENCE & SATELLITE INSPECTION MODAL
 *
 * Provides transparent access to the verified U-Net 15-channel pipeline outputs:
 * 1. Sentinel-2 L2A BOA Reflectance RGB
 * 2. U-Net Predicted Burned Area Binary Mask
 * 3. U-Net Burn Probability Heatmap Colormap
 * 4. Clear scientific provenance differentiating observed, predicted, and simulated data
 */

import React, { useState } from 'react';
import { Satellite, X } from 'lucide-react';

interface AIEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIEvidenceModal: React.FC<AIEvidenceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'PROVENANCE'>('EVIDENCE');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          width: '780px',
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.20)',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          color: '#1F2937',
          fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Satellite size={18} color="#059669" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#111827' }}>
                Copernicus Satellite Evidence & AI U-Net Detection
              </h3>
              <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>
                Central Amazon Study Footprint (-3.1190° S, -60.0217° W | 2.56 km × 2.56 km)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', padding: '0 20px' }}>
          <button
            onClick={() => setActiveTab('EVIDENCE')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'EVIDENCE' ? 700 : 500,
              color: activeTab === 'EVIDENCE' ? '#166534' : '#6B7280',
              borderBottom: activeTab === 'EVIDENCE' ? '2px solid #166534' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Raster Evidence & Masks
          </button>
          <button
            onClick={() => setActiveTab('PROVENANCE')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '0.78rem',
              fontWeight: activeTab === 'PROVENANCE' ? 700 : 500,
              color: activeTab === 'PROVENANCE' ? '#166534' : '#6B7280',
              borderBottom: activeTab === 'PROVENANCE' ? '2px solid #166534' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Scientific Methodology & Limits
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px' }}>
          {activeTab === 'EVIDENCE' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                {/* Sentinel-2 RGB */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F9FAFB', padding: '6px 10px', fontSize: '0.70rem', fontWeight: 600 }}>
                    Sentinel-2 L2A RGB (10m)
                  </div>
                  <div style={{ width: '100%', height: '170px', background: '#111827' }}>
                    <img
                      src="/data/amazon_sentinel2_rgb.png"
                      alt="Sentinel-2 RGB"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div style={{ padding: '6px 10px', fontSize: '0.62rem', color: '#6B7280' }}>
                    Copernicus Sentinel-2 BOA Surface Reflectance
                  </div>
                </div>

                {/* U-Net Binary Mask */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F9FAFB', padding: '6px 10px', fontSize: '0.70rem', fontWeight: 600 }}>
                    AI Burned Area Mask (τ = 0.50)
                  </div>
                  <div style={{ width: '100%', height: '170px', background: '#000000' }}>
                    <img
                      src="/data/amazon_unet_binary_mask.png"
                      alt="U-Net Binary Mask"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div style={{ padding: '6px 10px', fontSize: '0.62rem', color: '#6B7280' }}>
                    15-channel ResNet-UNet inference output
                  </div>
                </div>

                {/* Probability Colormap */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: '#F9FAFB', padding: '6px 10px', fontSize: '0.70rem', fontWeight: 600 }}>
                    Inference Heatmap
                  </div>
                  <div style={{ width: '100%', height: '170px', background: '#1E1B4B' }}>
                    <img
                      src="/data/amazon_unet_probability_colormap.png"
                      alt="Probability Colormap"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div style={{ padding: '6px 10px', fontSize: '0.62rem', color: '#6B7280' }}>
                    Calibrated burn probability distribution (0.0 to 1.0)
                  </div>
                </div>
              </div>

              {/* Technical Pipeline Specs */}
              <div
                style={{
                  background: '#F9FAFB',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.70rem',
                }}
              >
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                  Inference Architecture & Tensor Specifications
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', color: '#4B5563' }}>
                  <div>• Model Checkpoint: <code>land8fire_15ch_unet_full_dataset_best.pth</code></div>
                  <div>• Input Tensor: 15 Channels (B01–B12 + NDVI + NBR + NDRI)</div>
                  <div>• Projected CRS: UTM Zone 20S (EPSG:32720)</div>
                  <div>• Spatial Dimensions: 256 × 256 pixels @ 10.0m resolution (6.55 km²)</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.72rem', color: '#374151' }}>
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                  Scientific Provenance & Rigorous Data Integrity
                </div>
                <div style={{ color: '#047857', lineHeight: 1.5 }}>
                  This Digital Twin maintains strict provenance boundaries between measured geographic observations,
                  satellite AI inference, procedural 3D forest geometry, and experimental wildfire simulations.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <strong>1. Digital Elevation Model (Terrain):</strong> Derived from Copernicus DEM (GLO-90) at 90m resolution. True elevation ranges between 28m and 58m across this Central Amazon terra firme basin.
                </div>
                <div>
                  <strong>2. Hydrography & Water Bodies:</strong> Derived from authoritative ESA WorldCover 2021 v200 (10m) water classification, strictly carving the winding river and preventing vegetation placement within water channels.
                </div>
                <div>
                  <strong>3. 3D Vegetation Modeling:</strong> Individual 3D tree meshes are procedurally distributed to reflect real Amazonian botanical canopy stratification (emergent giants, upper canopy, understory palms, and riverbank shrubs) guided by Sentinel-2 NDVI density. They are not individually field-surveyed trees.
                </div>
                <div>
                  <strong>4. Wildfire Spread Simulation:</strong> Calculated using Rothermel surface fire spread physics with Byram flame length, moisture damping, and live wind vector advection. It represents an experimental simulation model, not an operational forecast.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
