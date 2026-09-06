import { LayerDataType } from './wildfireTypes';

export interface FireObservation {
  id: string;
  name: string;
  latitude: number; // Degrees South (negative value)
  longitude: number; // Degrees West (negative value)
  observationTime: string;
  source: string;
  satelliteInstrument: string;
  confidence: 'HIGH' | 'NOMINAL' | 'LOW';
  brightnessTempK: number; // Kelvin
  frpMW: number; // Fire Radiative Power in Megawatts
  classification: LayerDataType.OBSERVED;
  geographicRegion: string;
  country: string;
  description: string;
}

export const AMAZON_REAL_WILDFIRE_OBSERVATIONS: FireObservation[] = [
  {
    id: 'FIRMS_VIIRS_2024_AMAZONAS_0823',
    name: 'NASA FIRMS Fire Detection — Iranduba Corridor',
    latitude: -3.3842, // 3.3842° S
    longitude: -60.1985, // 60.1985° W
    observationTime: '2024-08-23T17:42:00Z',
    source: 'NASA FIRMS (Earthdata Active Fire Product)',
    satelliteInstrument: 'VIIRS / Suomi-NPP Satellite',
    confidence: 'HIGH',
    brightnessTempK: 348.2, // 348.2 K (~75°C thermal signature)
    frpMW: 42.6, // 42.6 MW Fire Radiative Power
    classification: LayerDataType.OBSERVED,
    geographicRegion: 'Iranduba Rainforest Corridor, Amazonas',
    country: 'Brazil',
    description:
      'Verified satellite thermal anomaly observation detected by the VIIRS instrument on NASA/NOAA Suomi-NPP satellite during peak dry season in Amazonas, Brazil.',
  },
];
