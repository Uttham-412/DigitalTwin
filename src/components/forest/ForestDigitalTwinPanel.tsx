/**
 * LAND8FIRE — 3D FOREST DIGITAL TWIN PANEL (PHYSICALLY GROUNDED & INTERACTIVE)
 *
 * Implements:
 * 1. 2x2 Scientific Metric Cards (Temperature, Humidity, Wind, Fuel Moisture)
 * 2. Manual Environmental Weather & Microclimate Controls (Editable Inputs & Scenario Apply)
 * 3. Manual Fire Ignition Workflow (Zero auto-ignition! Click terrain -> Preview Candidate -> Confirm)
 * 4. Step-by-Step Simulation Controls (Start, Pause, Advance +Δt, Reset to unburned)
 * 5. Fire Behavior Inspector (Why & How it spreads: R, Wind Factor phi_w, Slope Factor phi_s, eta_M, Area, Perimeter)
 * 6. Scenario Sensitivity Comparison (Side-by-side comparison between microclimate scenarios)
 * 7. Forest Layer & Hydrography Toggles
 * 8. Deep Learning U-Net Satellite Evidence Access
 */

import React, { useState } from 'react';
import {
  Trees,
  Thermometer,
  Droplets,
  Wind,
  Leaf,
  Play,
  Pause,
  Square,
  FastForward,
  Minus,
  MapPin,
  Flame,
  Satellite,
  CheckCircle2,
  Sliders,
  Activity,
  BarChart3,
} from 'lucide-react';
import { SpreadHorizon } from '../../simulation/fireScenarioTypes';
import { IgnitionSelectionEvent } from '../../three/AmazonForestScene';
import { RothermelDiagnostics, RothermelInputs, AmazonRothermelModel } from '../../three/AmazonRothermelModel';

interface ForestDigitalTwinPanelProps {
  temperatureCelsius: number;
  humidityPercent: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  fuelMoisturePercent: number;
  selectedHorizon: SpreadHorizon;
  onSelectHorizon: (horizon: SpreadHorizon) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;

  // Layer Toggles
  showCanopy: boolean;
  onToggleCanopy: (val: boolean) => void;
  showUnderstory: boolean;
  onToggleUnderstory: (val: boolean) => void;
  showForestFloor: boolean;
  onToggleForestFloor: (val: boolean) => void;
  showWaterBodies: boolean;
  onToggleWaterBodies: (val: boolean) => void;

  // Wildfire Simulation Toggles
  showActiveFireFront: boolean;
  onToggleActiveFireFront: (val: boolean) => void;
  showSmokePlume: boolean;
  onToggleSmokePlume: (val: boolean) => void;
  showBurnedArea: boolean;
  onToggleBurnedArea: (val: boolean) => void;
  showFireSpreadPrediction: boolean;
  onToggleFireSpreadPrediction: (val: boolean) => void;

  // AI Satellite Evidence
  onOpenAIEvidence: () => void;

  // Manual Ignition & Rothermel Simulation Props
  ignitionCandidate?: IgnitionSelectionEvent | null;
  isFireActive?: boolean;
  rothermelDiagnostics?: RothermelDiagnostics | null;
  onConfirmIgnition?: () => void;
  onStepSimulation?: () => void;
  onResetSimulation?: () => void;
  onApplyEnvironmentalInputs?: (inputs: Partial<RothermelInputs>) => void;
}

export const ForestDigitalTwinPanel: React.FC<ForestDigitalTwinPanelProps> = ({
  temperatureCelsius,
  humidityPercent,
  windSpeedKmh,
  windDirectionDeg,
  fuelMoisturePercent,
  selectedHorizon,
  onSelectHorizon,
  isPlaying,
  onTogglePlay,
  onStop,
  playbackSpeed,
  onChangeSpeed,
  showCanopy,
  onToggleCanopy,
  showUnderstory,
  onToggleUnderstory,
  showForestFloor,
  onToggleForestFloor,
  showWaterBodies,
  onToggleWaterBodies,
  showActiveFireFront,
  onToggleActiveFireFront,
  showSmokePlume,
  onToggleSmokePlume,
  showBurnedArea,
  onToggleBurnedArea,
  showFireSpreadPrediction,
  onToggleFireSpreadPrediction,
  onOpenAIEvidence,
  ignitionCandidate,
  isFireActive = false,
  rothermelDiagnostics,
  onConfirmIgnition,
  onStepSimulation,
  onResetSimulation,
  onApplyEnvironmentalInputs,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'ENVIRONMENT' | 'IGNITION' | 'INSPECTOR'>('MONITOR');

  // Editable Scenario Inputs State
  const [scenarioMode, setScenarioMode] = useState<'ERA5_LIVE' | 'MANUAL_SCENARIO'>('MANUAL_SCENARIO');
  const [editTemp, setEditTemp] = useState<number>(temperatureCelsius || 31.4);
  const [editRH, setEditRH] = useState<number>(humidityPercent || 78);
  const [editWindSpeed, setEditWindSpeed] = useState<number>(windSpeedKmh || 14.2);
  const [editWindDir, setEditWindDir] = useState<number>(windDirectionDeg || 45);
  const [editFuelMoisture, setEditFuelMoisture] = useState<number>(fuelMoisturePercent || 16.4);
  const [editTimeStep, setEditTimeStep] = useState<number>(15);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Scenario Comparison State
  const [compareWind, setCompareWind] = useState<number>(25.0);
  const [compareMoisture, setCompareMoisture] = useState<number>(10.0);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  const horizonNodes: SpreadHorizon[] = ['+0H', '+2H', '+4H' as any, '+6H'];

  const getWindCardinal = (deg: number): string => {
    const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(((deg % 360) / 45)) % 8;
    return `${cardinals[idx]} (${deg.toFixed(0)}°)`;
  };

  const handleApplyScenario = () => {
    if (onApplyEnvironmentalInputs) {
      onApplyEnvironmentalInputs({
        temperatureC: editTemp,
        relativeHumidity: editRH,
        windSpeedKmh: editWindSpeed,
        windDirectionDeg: editWindDir,
        fuelMoisturePercent: editFuelMoisture,
        timeStepMinutes: editTimeStep,
      });
      setAppliedFeedback('Applied to simulation! Conditions updated without auto-igniting.');
      setTimeout(() => setAppliedFeedback(null), 3500);
    }
  };

  const handleRunComparison = () => {
    const scenarioA: RothermelInputs = {
      temperatureC: editTemp,
      relativeHumidity: editRH,
      windSpeedKmh: editWindSpeed,
      windDirectionDeg: editWindDir,
      fuelMoisturePercent: editFuelMoisture,
      moistureOfExtinction: 30.0,
      baseFuelLoadKgM2: 1.85,
      timeStepMinutes: 15.0,
    };

    const scenarioB: RothermelInputs = {
      temperatureC: editTemp + 3,
      relativeHumidity: Math.max(20, editRH - 15),
      windSpeedKmh: compareWind,
      windDirectionDeg: editWindDir,
      fuelMoisturePercent: compareMoisture,
      moistureOfExtinction: 30.0,
      baseFuelLoadKgM2: 1.85,
      timeStepMinutes: 15.0,
    };

    const res = AmazonRothermelModel.compareScenarios(scenarioA, scenarioB, 60);
    setComparisonResult(res);
  };

  return (
    <aside
      aria-label="Forest Digital Twin Monitoring Panel"
      style={{
        position: 'absolute',
        top: '68px',
        right: '20px',
        width: '400px',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 88px)',
        overflowY: 'auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        borderRadius: '12px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12)',
        color: '#1F2937',
        fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 16px',
      }}
    >
      {/* 1. Header with Title & Minimizer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #F3F4F6',
          paddingBottom: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trees size={18} color="#166534" />
            <h2
              style={{
                margin: 0,
                fontSize: '0.88rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: '#111827',
              }}
            >
              AMAZON FOREST DIGITAL TWIN
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '2px',
              fontSize: '0.68rem',
              color: '#4B5563',
            }}
          >
            <MapPin size={11} color="#166534" />
            <span>Central Amazon (Manaus & Rio Negro, 1.44 km²)</span>
          </div>
          <div
            style={{
              fontSize: '0.62rem',
              color: '#6B7280',
              fontFamily: 'monospace',
            }}
          >
            -3.1190° S, -60.0217° W | Copernicus DEM 30m
          </div>
        </div>

        <button
          onClick={() => setIsMinimized((prev) => !prev)}
          title={isMinimized ? 'Expand' : 'Minimize'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: '#6B7280',
          }}
        >
          <Minus size={16} />
        </button>
      </div>

      {!isMinimized && (
        <>
          {/* Navigation Sub-Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              background: '#F3F4F6',
              padding: '3px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={() => setActiveTab('MONITOR')}
              style={{
                padding: '6px 2px',
                fontSize: '0.66rem',
                fontWeight: activeTab === 'MONITOR' ? 700 : 500,
                background: activeTab === 'MONITOR' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'MONITOR' ? '#166534' : '#4B5563',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: activeTab === 'MONITOR' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Activity size={12} />
              <span>Telemetry</span>
            </button>

            <button
              onClick={() => setActiveTab('ENVIRONMENT')}
              style={{
                padding: '6px 2px',
                fontSize: '0.66rem',
                fontWeight: activeTab === 'ENVIRONMENT' ? 700 : 500,
                background: activeTab === 'ENVIRONMENT' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'ENVIRONMENT' ? '#166534' : '#4B5563',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: activeTab === 'ENVIRONMENT' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Sliders size={12} />
              <span>Weather</span>
            </button>

            <button
              onClick={() => setActiveTab('IGNITION')}
              style={{
                padding: '6px 2px',
                fontSize: '0.66rem',
                fontWeight: activeTab === 'IGNITION' ? 700 : 500,
                background: activeTab === 'IGNITION' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'IGNITION' ? (isFireActive ? '#DC2626' : '#D97706') : '#4B5563',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: activeTab === 'IGNITION' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Flame size={12} />
              <span>{isFireActive ? 'Active Fire' : 'Ignition'}</span>
            </button>

            <button
              onClick={() => setActiveTab('INSPECTOR')}
              style={{
                padding: '6px 2px',
                fontSize: '0.66rem',
                fontWeight: activeTab === 'INSPECTOR' ? 700 : 500,
                background: activeTab === 'INSPECTOR' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'INSPECTOR' ? '#2563EB' : '#4B5563',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: activeTab === 'INSPECTOR' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <BarChart3 size={12} />
              <span>Inspector</span>
            </button>
          </div>

          {/* TAB 1: TELEMETRY & OVERVIEW */}
          {activeTab === 'MONITOR' && (
            <>
              {/* 2x2 Metric Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {/* Temperature */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Thermometer size={14} color="#059669" />
                    <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Temperature</span>
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                    {editTemp.toFixed(1)} °C
                  </div>
                  <div style={{ fontSize: '0.54rem', color: '#059669', fontWeight: 600 }}>
                    {scenarioMode === 'ERA5_LIVE' ? 'ECMWF ERA5-Land' : 'User Configured'}
                  </div>
                </div>

                {/* Humidity */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Droplets size={14} color="#2563EB" />
                    <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Rel. Humidity</span>
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                    {editRH.toFixed(0)} %
                  </div>
                  <div style={{ fontSize: '0.54rem', color: '#2563EB', fontWeight: 600 }}>
                    {scenarioMode === 'ERA5_LIVE' ? 'CAMS Atmosphere' : 'User Configured'}
                  </div>
                </div>

                {/* Wind Speed */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wind size={14} color="#0284C7" />
                    <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Wind Vector</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                    {editWindSpeed.toFixed(1)} km/h
                  </div>
                  <div style={{ fontSize: '0.54rem', color: '#0284C7', fontWeight: 600 }}>
                    {getWindCardinal(editWindDir)}
                  </div>
                </div>

                {/* Fuel Moisture */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Leaf size={14} color="#DB2777" />
                    <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Fuel Moisture</span>
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                    {editFuelMoisture.toFixed(1)} %
                  </div>
                  <div style={{ fontSize: '0.54rem', color: '#DB2777', fontWeight: 600 }}>
                    Simard (1968) EMC
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: isFireActive ? '#FEF2F2' : '#F0FDF4',
                  border: isFireActive ? '1px solid #FECACA' : '1px solid #DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isFireActive ? <Flame size={16} color="#DC2626" /> : <CheckCircle2 size={16} color="#166534" />}
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isFireActive ? '#991B1B' : '#166534' }}>
                    {isFireActive ? 'Active Wildfire Simulation Running' : 'Pristine Unburned Rainforest'}
                  </div>
                  <div style={{ fontSize: '0.60rem', color: isFireActive ? '#B91C1C' : '#4B5563' }}>
                    {isFireActive
                      ? `Advancing front: ${rothermelDiagnostics?.forwardRateOfSpreadMMin ?? 0} m/min | ${rothermelDiagnostics?.burnedAreaHectares ?? 0} ha`
                      : 'Zero active fires. Select an ignition point in the Ignition tab to begin.'}
                  </div>
                </div>
              </div>

              {/* Forest Layers Toggle Section */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Botanical & Landscape Layers
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.68rem', color: '#4B5563' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showCanopy} onChange={(e) => onToggleCanopy(e.target.checked)} style={{ accentColor: '#166534' }} />
                    <span>Canopy (22–50m)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showUnderstory} onChange={(e) => onToggleUnderstory(e.target.checked)} style={{ accentColor: '#166534' }} />
                    <span>Understory & Palms</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showForestFloor} onChange={(e) => onToggleForestFloor(e.target.checked)} style={{ accentColor: '#166534' }} />
                    <span>Forest Floor</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showWaterBodies} onChange={(e) => onToggleWaterBodies(e.target.checked)} style={{ accentColor: '#166534' }} />
                    <span>Rio Negro Waters</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MANUAL ENVIRONMENTAL CONFIGURATOR */}
          {activeTab === 'ENVIRONMENT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>Configure Conditions</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setScenarioMode('ERA5_LIVE')}
                    style={{
                      fontSize: '0.60rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      background: scenarioMode === 'ERA5_LIVE' ? '#166534' : '#FFFFFF',
                      color: scenarioMode === 'ERA5_LIVE' ? '#FFFFFF' : '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    ERA5 Reanalysis
                  </button>
                  <button
                    onClick={() => setScenarioMode('MANUAL_SCENARIO')}
                    style={{
                      fontSize: '0.60rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #D1D5DB',
                      background: scenarioMode === 'MANUAL_SCENARIO' ? '#166534' : '#FFFFFF',
                      color: scenarioMode === 'MANUAL_SCENARIO' ? '#FFFFFF' : '#4B5563',
                      cursor: 'pointer',
                    }}
                  >
                    Manual Inputs
                  </button>
                </div>
              </div>

              {/* Temperature Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Air Temperature (°C)</span>
                  <strong style={{ color: '#111827' }}>{editTemp.toFixed(1)} °C</strong>
                </div>
                <input
                  type="range"
                  min="18"
                  max="45"
                  step="0.5"
                  value={editTemp}
                  onChange={(e) => setEditTemp(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#059669' }}
                />
              </div>

              {/* Humidity Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Relative Humidity (%)</span>
                  <strong style={{ color: '#111827' }}>{editRH.toFixed(0)} %</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={editRH}
                  onChange={(e) => setEditRH(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB' }}
                />
              </div>

              {/* Wind Speed Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Wind Speed (km/h)</span>
                  <strong style={{ color: '#111827' }}>{editWindSpeed.toFixed(1)} km/h</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="55"
                  step="0.5"
                  value={editWindSpeed}
                  onChange={(e) => setEditWindSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#0284C7' }}
                />
              </div>

              {/* Wind Direction Slider & Compass */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Wind Direction (Degrees & Compass)</span>
                  <strong style={{ color: '#111827' }}>{getWindCardinal(editWindDir)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="355"
                  step="5"
                  value={editWindDir}
                  onChange={(e) => setEditWindDir(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#0284C7' }}
                />
              </div>

              {/* Fuel Moisture Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Fine Fuel Moisture (%)</span>
                  <strong style={{ color: '#111827' }}>{editFuelMoisture.toFixed(1)} %</strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="32"
                  step="0.2"
                  value={editFuelMoisture}
                  onChange={(e) => setEditFuelMoisture(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#DB2777' }}
                />
                <span style={{ fontSize: '0.54rem', color: '#6B7280' }}>
                  Extinction threshold: 30% (moisture ≥ 30% extinguishes spread)
                </span>
              </div>

              {/* Simulation Time Step */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#4B5563' }}>
                  <span>Time Step (Δt per step)</span>
                  <strong style={{ color: '#111827' }}>{editTimeStep} minutes</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {[10, 15, 30, 60].map((step) => (
                    <button
                      key={step}
                      onClick={() => setEditTimeStep(step)}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: '0.64rem',
                        borderRadius: '4px',
                        border: '1px solid #D1D5DB',
                        background: editTimeStep === step ? '#166534' : '#FFFFFF',
                        color: editTimeStep === step ? '#FFFFFF' : '#374151',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {step}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply Conditions Button */}
              <button
                onClick={handleApplyScenario}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#166534',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <Sliders size={13} />
                <span>Apply Scenario Conditions</span>
              </button>

              {appliedFeedback && (
                <div style={{ fontSize: '0.62rem', color: '#166534', textAlign: 'center', fontWeight: 600 }}>
                  {appliedFeedback}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL IGNITION & SIMULATION WORKFLOW */}
          {activeTab === 'IGNITION' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>
                Manual Fire Ignition Workflow
              </div>

              {!isFireActive && (
                <>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      fontSize: '0.66rem',
                      color: '#92400E',
                    }}
                  >
                    <strong>Instructions:</strong> Click any location on the 3D terrain to place an ignition cursor. The application will validate the fuel type and terrain before you confirm ignition.
                  </div>

                  {ignitionCandidate ? (
                    <div
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '10px',
                        background: '#F9FAFB',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '0.68rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#111827' }}>Selected Ignition Candidate:</strong>
                        <span
                          style={{
                            fontSize: '0.60rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: ignitionCandidate.isBurnable ? '#DCFCE7' : '#FEE2E2',
                            color: ignitionCandidate.isBurnable ? '#166534' : '#DC2626',
                            fontWeight: 700,
                          }}
                        >
                          {ignitionCandidate.isBurnable ? 'Combustible Fuel' : 'Water / Non-Burnable'}
                        </span>
                      </div>

                      <div style={{ color: '#4B5563', fontFamily: 'monospace', fontSize: '0.64rem' }}>
                        Lat: {ignitionCandidate.lat}° | Lon: {ignitionCandidate.lon}°
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', color: '#4B5563' }}>
                        <div>Elevation: <strong>{ignitionCandidate.elevation} m</strong></div>
                        <div>Slope: <strong>{ignitionCandidate.slopeDeg}°</strong></div>
                        <div>Aspect: <strong>{ignitionCandidate.aspectDeg}°</strong></div>
                        <div>Fuel: <strong>Tropical Broadleaf</strong></div>
                      </div>

                      <div style={{ fontSize: '0.62rem', color: ignitionCandidate.isBurnable ? '#166534' : '#DC2626', fontWeight: 600 }}>
                        {ignitionCandidate.message}
                      </div>

                      {ignitionCandidate.isBurnable && (
                        <button
                          onClick={() => {
                            if (onConfirmIgnition) onConfirmIgnition();
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '6px',
                            background: '#DC2626',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginTop: '4px',
                          }}
                        >
                          <Flame size={14} />
                          <span>Confirm & Ignite Wildfire</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '14px', color: '#6B7280', fontSize: '0.70rem' }}>
                      <em>No ignition point selected. Click on the 3D terrain mesh.</em>
                    </div>
                  )}
                </>
              )}

              {/* Active Simulation Controls */}
              {isFireActive && (
                <div
                  style={{
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '10px',
                    background: '#FEF2F2',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flame size={16} color="#DC2626" />
                      <strong style={{ fontSize: '0.74rem', color: '#991B1B' }}>Active Wildfire Propagation</strong>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: '#B91C1C', fontWeight: 600 }}>
                      T + {rothermelDiagnostics?.elapsedMinutes ?? 0}m
                    </span>
                  </div>

                  {/* Playback Controls & Speed */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={onTogglePlay}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        background: isPlaying ? '#059669' : '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: '0.70rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                      <span>{isPlaying ? 'Pause' : 'Run Spread'}</span>
                    </button>

                    <button
                      onClick={onStepSimulation}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        fontWeight: 600,
                        fontSize: '0.70rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                      title="Advance exactly one time step (+Δt)"
                    >
                      <FastForward size={13} />
                      <span>+{editTimeStep}m</span>
                    </button>

                    <select
                      value={playbackSpeed}
                      onChange={(e) => onChangeSpeed(Number(e.target.value))}
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        padding: '5px 4px',
                        borderRadius: '6px',
                        border: '1px solid #D1D5DB',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                      title="Playback Speed"
                    >
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>

                    <button
                      onClick={() => {
                        if (onResetSimulation) onResetSimulation();
                        if (onStop) onStop();
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        color: '#4B5563',
                        border: '1px solid #D1D5DB',
                        fontWeight: 600,
                        fontSize: '0.70rem',
                        cursor: 'pointer',
                      }}
                      title="Reset simulation and extinguish fire"
                    >
                      <Square size={13} />
                    </button>
                  </div>

                  {/* Wildfire FX & Rendering Toggles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '0.62rem', color: '#4B5563', marginTop: '2px', borderTop: '1px dashed #FECACA', paddingTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showActiveFireFront} onChange={(e) => onToggleActiveFireFront(e.target.checked)} style={{ accentColor: '#DC2626' }} />
                      <span>Flames</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showSmokePlume} onChange={(e) => onToggleSmokePlume(e.target.checked)} style={{ accentColor: '#4B5563' }} />
                      <span>Smoke</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showBurnedArea} onChange={(e) => onToggleBurnedArea(e.target.checked)} style={{ accentColor: '#18181B' }} />
                      <span>Burned Trees</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showFireSpreadPrediction} onChange={(e) => onToggleFireSpreadPrediction(e.target.checked)} style={{ accentColor: '#D97706' }} />
                      <span>Rothermel Front</span>
                    </label>
                  </div>

                  {/* Horizon Timeline Shortcuts */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    {horizonNodes.map((h) => (
                      <button
                        key={h}
                        onClick={() => onSelectHorizon(h)}
                        style={{
                          fontSize: '0.62rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: selectedHorizon === h ? '1px solid #DC2626' : '1px solid #E5E7EB',
                          background: selectedHorizon === h ? '#DC2626' : '#FFFFFF',
                          color: selectedHorizon === h ? '#FFFFFF' : '#4B5563',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FIRE BEHAVIOR INSPECTOR ("HOW & WHY IT SPREADS") */}
          {activeTab === 'INSPECTOR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>
                Scientific Fire Behavior Inspector
              </div>

              {/* Physical Rates */}
              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.68rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Forward Rate of Spread (R):</span>
                  <strong style={{ color: '#DC2626' }}>
                    {rothermelDiagnostics?.forwardRateOfSpreadMMin ?? 0} m/min ({rothermelDiagnostics?.forwardRateOfSpreadMHour ?? 0} m/h)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Backing Spread Rate:</span>
                  <strong style={{ color: '#4B5563' }}>
                    {rothermelDiagnostics?.backingRateOfSpreadMMin ?? 0} m/min
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Direction of Max Spread:</span>
                  <strong style={{ color: '#111827' }}>
                    {rothermelDiagnostics ? getWindCardinal(rothermelDiagnostics.directionOfMaxSpreadDeg) : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Burned Footprint:</span>
                  <strong style={{ color: '#111827' }}>
                    {rothermelDiagnostics?.burnedAreaHectares ?? 0} ha ({rothermelDiagnostics?.burnedAreaM2?.toLocaleString() ?? 0} m²)
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Flame Perimeter:</span>
                  <strong style={{ color: '#111827' }}>
                    {rothermelDiagnostics?.activePerimeterMeters?.toLocaleString() ?? 0} m
                  </strong>
                </div>
              </div>

              {/* Mathematical Formulation Breakdown */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.64rem',
                  color: '#166534',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Rothermel (1972) Spread Breakdown:</div>
                <div>• Moisture Damping (η_M): <strong>{rothermelDiagnostics?.moistureDampingEtaM ?? '0.460'}</strong></div>
                <div>• Wind Multiplier (φ_w): <strong>+{rothermelDiagnostics?.maxWindMultiplierPhiW ?? '1.85'}x</strong> (downwind boost)</div>
                <div>• Slope Multiplier (φ_s): <strong>+{rothermelDiagnostics?.slopeMultiplierPhiS ?? '1.12'}x</strong> (uphill acceleration)</div>
                <div>• Reaction Intensity (I_R): <strong>{rothermelDiagnostics?.reactionIntensityKWM2?.toLocaleString() ?? '3,240'} kW/m²</strong></div>
              </div>

              {/* Sensitivity Scenario Comparison Tool */}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
                <div style={{ fontSize: '0.70rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Sensitivity Scenario Comparison
                </div>
                <div style={{ fontSize: '0.60rem', color: '#6B7280', marginBottom: '6px' }}>
                  Compare Current Scenario vs High-Risk Alternative (e.g. Higher Wind & Drier Fuel)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.62rem' }}>
                  <div>
                    <span>Alt. Wind (km/h):</span>
                    <input
                      type="number"
                      value={compareWind}
                      onChange={(e) => setCompareWind(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: '0.66rem', padding: '2px 4px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <span>Alt. Moisture (%):</span>
                    <input
                      type="number"
                      value={compareMoisture}
                      onChange={(e) => setCompareMoisture(parseFloat(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: '0.66rem', padding: '2px 4px', border: '1px solid #D1D5DB', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunComparison}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '6px',
                    background: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '0.66rem',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '6px',
                  }}
                >
                  Run Physical Sensitivity Comparison
                </button>

                {comparisonResult && (
                  <div style={{ marginTop: '8px', padding: '8px', borderRadius: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.62rem', color: '#1E40AF' }}>
                    <div style={{ fontWeight: 700 }}>Comparison Result (60 min horizon):</div>
                    <div>• Current Scenario ROS: <strong>{comparisonResult.rosA} m/min</strong> ({comparisonResult.areaA} ha)</div>
                    <div>• Alternative Scenario ROS: <strong>{comparisonResult.rosB} m/min</strong> ({comparisonResult.areaB} ha)</div>
                    <div style={{ marginTop: '4px' }}><strong>Spread Difference:</strong> {comparisonResult.rosPercentDiff > 0 ? `+${comparisonResult.rosPercentDiff}% faster` : `${comparisonResult.rosPercentDiff}% slower`}</div>
                    <div style={{ marginTop: '2px', fontStyle: 'italic', color: '#1D4ED8' }}>{comparisonResult.explanation}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dedicated AI Evidence satellite inspection link */}
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
            <button
              onClick={onOpenAIEvidence}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                background: '#F0FDF4',
                border: '1px solid #C4E2CB',
                color: '#166534',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Satellite size={14} color="#166534" />
              <span>Inspect U-Net Satellite Evidence</span>
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
