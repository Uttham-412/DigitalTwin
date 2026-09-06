import React from 'react';
import { UNetInferenceResponse } from '../../services/unetInferenceService';

interface UNetInferencePanelProps {
  response: UNetInferenceResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

export const UNetInferencePanel: React.FC<UNetInferencePanelProps> = ({
  response,
  isLoading,
  onClose
}) => {
  if (!isLoading && !response) return null;

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '16px',
        padding: '20px',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        marginBottom: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '10px',
          marginBottom: '14px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              boxShadow: '0 0 10px #EF4444'
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#EF4444'
            }}
          >
            AI WILDFIRE ANALYSIS
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: '13px' }}>
          <div
            style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '2px solid rgba(239, 68, 68, 0.2)',
              borderTopColor: '#EF4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '8px'
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div>RUNNING U-NET INFERENCE...</div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Preparing 15-channel Sentinel-2 multispectral input tensor
          </div>
        </div>
      )}

      {/* Response Status: Unavailable / Error */}
      {!isLoading && response && response.status !== 'success' && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '14px',
            color: '#F87171',
            fontSize: '12px'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>
            SATELLITE DATA INSUFFICIENT FOR U-NET INFERENCE
          </div>
          <div style={{ fontSize: '11px', color: '#FCA5A5', lineHeight: 1.4 }}>
            {response.message ||
              'U-Net inference unavailable: required Sentinel-2 bands are not available from the selected imagery source.'}
          </div>
        </div>
      )}

      {/* Response Status: Success */}
      {!isLoading && response && response.status === 'success' && (
        <>
          {/* Metadata Badges */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>PROVENANCE</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F87171' }}>
                {response.provenance || 'DERIVED / U-NET INFERENCE'}
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.4)'
              }}
            >
              FROZEN THRESHOLD 0.65
            </span>
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '14px'
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                padding: '10px',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>MODEL</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0' }}>
                Land8Fire 15-ch U-Net
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                padding: '10px',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>PREDICTED BURNED</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#EF4444' }}>
                {response.predictedBurnedPercentage}%
              </div>
              <div style={{ fontSize: '9px', color: '#94A3B8' }}>
                ({response.predictedBurnedPixels?.toLocaleString()} / 65,536 px)
              </div>
            </div>
          </div>

          {/* Scene Metadata Readout */}
          <div
            style={{
              fontSize: '11px',
              color: '#94A3B8',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '12px',
              lineHeight: 1.5
            }}
          >
            <div>
              <strong style={{ color: '#CBD5E1' }}>Satellite:</strong> Sentinel-2 (Level-2A)
            </div>
            <div>
              <strong style={{ color: '#CBD5E1' }}>Target Scene:</strong>{' '}
              {response.sceneId || 'Patch 433'}
            </div>
            <div>
              <strong style={{ color: '#CBD5E1' }}>Acquisition:</strong>{' '}
              {response.acquisitionTime || '2017-07-31'}
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div
            style={{
              fontSize: '10px',
              color: '#64748B',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '10px',
              lineHeight: 1.4,
              fontStyle: 'italic'
            }}
          >
            "This U-Net output represents satellite-image burned-area segmentation. It is not future fire-spread prediction."
          </div>
        </>
      )}
    </div>
  );
};
