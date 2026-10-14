/**
 * LAND8FIRE — 3D AMAZON RAINFOREST DIGITAL TWIN
 * Geographic Grounding & Study Area Specifications
 *
 * Location: Central Amazon Basin, Manaus & Anavilhanas Region, Brazil
 * Geographic Reference: -3.1190° S, -60.0217° W
 * Study Footprint: 2,560m x 2,560m = 6.55 km²
 * Projected Coordinate System: UTM Zone 20S (EPSG:32720)
 * Elevation: Copernicus DEM 90m (35m - 58m above sea level)
 * Hydrography: ESA WorldCover 10m permanent water bodies
 * Forest Classification: Dense Terra Firme Evergreen Rainforest & Igapó Floodplain
 */

export interface StudyAreaExtent {
  name: string;
  region: string;
  country: string;
  centerCoordinates: {
    latitude: number;
    longitude: number;
    altitudeMeters: number;
  };
  geographicBounds: {
    west: number;
    east: number;
    south: number;
    north: number;
  };
  projectedBoundsUTM20S: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  dimensions: {
    widthMeters: number;
    depthMeters: number;
    areaKm2: number;
  };
  elevationProfile: {
    minMeters: number;
    maxMeters: number;
    meanMeters: number;
    riverLevelMeters: number;
    source: string;
  };
  botanicalTiers: {
    emergent: { minHeight: number; maxHeight: number; label: string };
    canopy: { minHeight: number; maxHeight: number; label: string };
    understory: { minHeight: number; maxHeight: number; label: string };
    forestFloor: { minHeight: number; maxHeight: number; label: string };
  };
}

export const AMAZON_STUDY_AREA: StudyAreaExtent = {
  name: 'Amazon Rainforest (Manaus Region)',
  region: 'Central Amazon Basin, Amazonas',
  country: 'Brazil',
  centerCoordinates: {
    latitude: -3.1190,
    longitude: -60.0217,
    altitudeMeters: 45.0,
  },
  geographicBounds: {
    west: -60.0332,
    east: -60.0102,
    south: -3.1305,
    north: -3.1075,
  },
  projectedBoundsUTM20S: {
    xMin: 829790.0,
    xMax: 832350.0,
    yMin: 9653500.0,
    yMax: 9656060.0,
  },
  dimensions: {
    widthMeters: 2560.0,
    depthMeters: 2560.0,
    areaKm2: 6.55,
  },
  elevationProfile: {
    minMeters: 9.4,
    maxMeters: 86.1,
    meanMeters: 46.7,
    riverLevelMeters: 18.5,
    source: 'Copernicus DEM 30m (GLO-30) COG / European Space Agency',
  },
  botanicalTiers: {
    emergent: { minHeight: 35.0, maxHeight: 50.0, label: 'Emergent Giants (35–50m)' },
    canopy: { minHeight: 20.0, maxHeight: 35.0, label: 'Canopy Layer (20–35m)' },
    understory: { minHeight: 6.0, maxHeight: 20.0, label: 'Understory & Palms (6–20m)' },
    forestFloor: { minHeight: 0.5, maxHeight: 6.0, label: 'Forest Floor & Shrubs (0–6m)' },
  },
};
