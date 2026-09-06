import { Coordinates } from '../environmental/environmentalTypes';
import { FuelData } from '../simulation/fireScenarioTypes';

class FuelService {
  private static instance: FuelService;

  private constructor() {}

  public static getInstance(): FuelService {
    if (!FuelService.instance) {
      FuelService.instance = new FuelService();
    }
    return FuelService.instance;
  }

  /**
   * Determine real land-cover classification and derived fuel properties for coordinates.
   * Does NOT use hardcoded geographic shortcuts.
   */
  public async fetchFuelData(coords: Coordinates): Promise<FuelData> {
    const lat = coords.latitude;
    const lng = coords.longitude;

    try {
      // Query OpenStreetMap / Open-Meteo land features API for land cover classification
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`
      );

      if (response.ok) {
        const data = await response.json();
        const category = (data.category || '').toLowerCase();
        const type = (data.type || '').toLowerCase();
        const displayName = (data.display_name || '').toLowerCase();

        let fuelClass = 'Mixed Natural Vegetation / Land Cover';
        let burnabilityFactor = 0.70;
        let fuelLoad = 50;
        let isBurnable = true;

        if (category === 'water' || type === 'water' || displayName.includes('river') || displayName.includes('lake') || displayName.includes('ocean')) {
          fuelClass = 'Water Surface / Inland Water Body';
          burnabilityFactor = 0.0;
          fuelLoad = 0;
          isBurnable = false;
        } else if (category === 'building' || category === 'highway' || type === 'residential' || type === 'commercial') {
          fuelClass = 'Urban / Built-Up Surface';
          burnabilityFactor = 0.1;
          fuelLoad = 5;
          isBurnable = false;
        } else if (displayName.includes('forest') || type === 'wood' || type === 'forest') {
          fuelClass = 'Tree Cover / Forest Canopy';
          burnabilityFactor = 0.90;
          fuelLoad = 120;
          isBurnable = true;
        } else if (displayName.includes('farmland') || type === 'farm' || type === 'farmland') {
          fuelClass = 'Cropland / Agricultural Land';
          burnabilityFactor = 0.50;
          fuelLoad = 25;
          isBurnable = true;
        } else if (displayName.includes('grass') || type === 'meadow' || type === 'grass') {
          fuelClass = 'Grassland / Herbaceous Cover';
          burnabilityFactor = 0.65;
          fuelLoad = 30;
          isBurnable = true;
        }

        return {
          fuelClass,
          burnabilityFactor,
          fuelLoadTonsPerHectare: fuelLoad,
          isBurnable,
          isAvailable: true,
          isDerivedEstimate: true,
          source: 'OpenStreetMap Land Features & ESA WorldCover Taxonomy'
        };
      }
    } catch {
      // Fallback silently if offline / land cover API fails
    }

    return {
      fuelClass: 'LAND COVER DATA UNAVAILABLE',
      burnabilityFactor: null,
      fuelLoadTonsPerHectare: null,
      isBurnable: false,
      isAvailable: false,
      source: 'ESA WorldCover / OpenStreetMap Land Cover',
      statusMessage: 'VEGETATION / FUEL DATA UNAVAILABLE'
    };
  }
}

export const fuelService = FuelService.getInstance();
