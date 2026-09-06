import React, { useState } from 'react';
import {
  SpreadSimulationResult,
  SpreadHorizon
} from '../../simulation/fireScenarioTypes';

interface FireSpreadPanelProps {
  simulationResult: SpreadSimulationResult | null;
  selectedHorizon: SpreadHorizon;
  onSelectHorizon: (h: SpreadHorizon) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const FireSpreadPanel: React.FC<FireSpreadPanelProps> = ({
  simulationResult,
  selectedHorizon,
  onSelectHorizon,
  onClose,
  isLoading = false
}) => {
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  if (!isLoading && !simulationResult) return null;

  const currentStep = simulationResult?.timesteps[selectedHorizon];

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(249, 115, 22, 0.4)',
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
              backgroundColor: '#F97316',
              boxShadow: '0 0 10px #F97316'
            }}
          />
          <h3
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#F97316'
            }}
          >
            FIRE SPREAD ANALYSIS
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

      {/* Loading state */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: '13px' }}>
          <div
            style={{
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '2px solid rgba(249, 115, 22, 0.2)',
              borderTopColor: '#F97316',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '8px'
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div>CALCULATING SPREAD SIMULATION...</div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Evaluating wind vector, slope, aspect, humidity & fuel factors
          </div>
        </div>
      )}

      {!isLoading && simulationResult && currentStep && (
        <>
          {/* Provenance & Horizon Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '14px'
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>PROVENANCE</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#FDBA74' }}>
                {simulationResult.provenance}
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(249, 115, 22, 0.2)',
                color: '#F97316',
                border: '1px solid rgba(249, 115, 22, 0.4)'
              }}
            >
              SIMULATION
            </span>
          </div>

          {/* Forecast Horizon Tabs */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>
              PREDICTION HORIZON
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['+1H', '+2H', '+6H', '+12H', '+24H'] as SpreadHorizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => onSelectHorizon(h)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border:
                      selectedHorizon === h
                        ? '1px solid #F97316'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor:
                      selectedHorizon === h ? 'rgba(249, 115, 22, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    color: selectedHorizon === h ? '#F97316' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Metrics */}
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
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>AFFECTED AREA</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#F97316' }}>
                {currentStep.affectedAreaHectares} <span style={{ fontSize: '12px' }}>ha</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                padding: '10px',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>RATE OF SPREAD</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FDBA74' }}>
                {currentStep.rateOfSpreadMetersPerMin} <span style={{ fontSize: '12px' }}>m/min</span>
              </div>
            </div>
          </div>

          {/* 1. SCENARIO SECTION */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#FDBA74', letterSpacing: '0.05em', marginBottom: '4px' }}>
              SCENARIO — SIMULATED IGNITION
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
              <div><strong>Location:</strong> {simulationResult.initialFireState.latitude.toFixed(4)}° N, {simulationResult.initialFireState.longitude.toFixed(4)}° E</div>
              <div><strong>Timestamp:</strong> {new Date(simulationResult.initialFireState.timestamp).toLocaleString()}</div>
              <div><strong>Provenance:</strong> {simulationResult.initialFireState.provenance}</div>
            </div>
          </div>

          {/* 2. ENVIRONMENT SECTION */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em', marginBottom: '4px' }}>
              ENVIRONMENT (Open-Meteo)
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
              <div><strong>Temperature:</strong> {currentStep.environmentalState.temperature.toFixed(1)} °C</div>
              <div><strong>Humidity:</strong> {currentStep.environmentalState.relativeHumidity}%</div>
              <div><strong>Wind:</strong> {currentStep.environmentalState.windSpeed} km/h (Direction {currentStep.environmentalState.windDirection}° {currentStep.environmentalState.windDirectionCardinal})</div>
              <div><strong>Precipitation:</strong> {currentStep.environmentalState.precipitation} mm</div>
              <div><strong>Pressure:</strong> {currentStep.environmentalState.surfacePressure} hPa</div>
            </div>
          </div>

          {/* 3. TERRAIN SECTION */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#A7F3D0', letterSpacing: '0.05em', marginBottom: '4px' }}>
              TERRAIN (Cesium 3D World DEM)
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
              {simulationResult.terrain.isAvailable ? (
                <>
                  <div><strong>Elevation:</strong> {simulationResult.terrain.elevationMeters !== null ? `${simulationResult.terrain.elevationMeters} m` : 'ELEVATION DATA UNAVAILABLE'}</div>
                  <div><strong>Slope:</strong> {simulationResult.terrain.slopeDegrees !== null ? `${simulationResult.terrain.slopeDegrees}°` : 'SLOPE DATA UNAVAILABLE'}</div>
                  <div><strong>Aspect:</strong> {simulationResult.terrain.aspectDegrees !== null ? `${simulationResult.terrain.aspectDegrees}° (${simulationResult.terrain.aspectCardinal})` : 'ASPECT DATA UNAVAILABLE'}</div>
                </>
              ) : (
                <div style={{ color: '#EF4444', fontWeight: 600 }}>TERRAIN DATA UNAVAILABLE</div>
              )}
            </div>
          </div>

          {/* 4. VEGETATION / FUEL SECTION */}
          <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#F472B6', letterSpacing: '0.05em', marginBottom: '4px' }}>
              VEGETATION / FUEL
            </div>
            <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: 1.4 }}>
              {simulationResult.fuel.isAvailable ? (
                <>
                  <div><strong>Land Cover:</strong> {simulationResult.fuel.fuelClass}</div>
                  <div><strong>Fuel Load:</strong> {simulationResult.fuel.fuelLoadTonsPerHectare !== null ? `${simulationResult.fuel.fuelLoadTonsPerHectare} t/ha (${simulationResult.fuel.isDerivedEstimate ? 'DERIVED ESTIMATE' : 'MEASURED'})` : 'FUEL LOAD DATA UNAVAILABLE'}</div>
                  <div><strong>Burnability Coefficient:</strong> {simulationResult.fuel.burnabilityFactor !== null ? simulationResult.fuel.burnabilityFactor.toFixed(2) : 'DATA UNAVAILABLE'}</div>
                </>
              ) : (
                <div style={{ color: '#EF4444', fontWeight: 600 }}>FUEL DATA UNAVAILABLE</div>
              )}
            </div>
          </div>

          {/* 5. FUTURE SPREAD SECTION */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '6px' }}>
              PREDICTION HORIZON
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['+1H', '+2H', '+6H', '+12H', '+24H'] as SpreadHorizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => onSelectHorizon(h)}
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border:
                      selectedHorizon === h
                        ? '1px solid #F97316'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor:
                      selectedHorizon === h ? 'rgba(249, 115, 22, 0.25)' : 'rgba(30, 41, 59, 0.6)',
                    color: selectedHorizon === h ? '#F97316' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Prediction Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '12px'
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                padding: '10px',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>AFFECTED AREA</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#F97316' }}>
                {currentStep.affectedAreaHectares} <span style={{ fontSize: '12px' }}>ha</span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.6)',
                padding: '10px',
                borderRadius: '8px'
              }}
            >
              <div style={{ fontSize: '10px', color: '#94A3B8' }}>RATE OF SPREAD</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FDBA74' }}>
                {currentStep.rateOfSpreadMetersPerMin} <span style={{ fontSize: '12px' }}>m/min</span>
              </div>
            </div>
          </div>

          {/* Expandable Explanation Section */}
          <div
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '10px',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              marginBottom: '12px',
              overflow: 'hidden'
            }}
          >
            <button
              onClick={() => setShowExplanation((prev) => !prev)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                color: '#F97316',
                fontWeight: 700,
                fontSize: '11px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>WHY IS THE FIRE SPREADING THIS WAY?</span>
              <span>{showExplanation ? '▲' : '▼'}</span>
            </button>

            {showExplanation && (
              <div
                style={{
                  padding: '0 12px 12px 12px',
                  fontSize: '11px',
                  color: '#CBD5E1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  lineHeight: 1.4
                }}
              >
                <div>
                  <strong style={{ color: '#38BDF8' }}>WIND VECTOR:</strong>{' '}
                  {currentStep.environmentalState.windSpeed} km/h from {currentStep.environmentalState.windDirectionCardinal} ({currentStep.environmentalState.windDirection}°). Pushes fire toward {((currentStep.environmentalState.windDirection + 180) % 360).toFixed(0)}°.
                </div>
                <div>
                  <strong style={{ color: '#A7F3D0' }}>TERRAIN EFFECT:</strong>{' '}
                  {simulationResult.terrain.isAvailable && simulationResult.terrain.slopeDegrees !== null
                    ? `${simulationResult.terrain.slopeDegrees}° slope toward ${simulationResult.terrain.aspectCardinal}. Fire advances faster uphill along slope aspect.`
                    : 'TERRAIN SLOPE DATA UNAVAILABLE (Computed on flat baseline)'}
                </div>
                <div>
                  <strong style={{ color: '#FDBA74' }}>MOISTURE & HUMIDITY:</strong>{' '}
                  {currentStep.environmentalState.relativeHumidity}% RH with {currentStep.environmentalState.precipitation}mm precip. Lower moisture increases fuel flammability.
                </div>
                <div>
                  <strong style={{ color: '#F472B6' }}>FUEL AVAILABILITY:</strong>{' '}
                  {simulationResult.fuel.isAvailable
                    ? `${simulationResult.fuel.fuelClass} (Factor ${simulationResult.fuel.burnabilityFactor ?? 'N/A'})`
                    : 'FUEL DATA UNAVAILABLE (Baseline vegetation coefficient applied)'}
                </div>
              </div>
            )}
          </div>

          {/* Model Limitation Disclaimer */}
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
            "{simulationResult.disclaimer}"
          </div>
        </>
      )}
    </div>
  );
};
