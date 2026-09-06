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
   * Determine land-cover fuel class and burnability factor for coordinates.
   */
  public fetchFuelData(coords: Coordinates): FuelData {
    const lat = coords.latitude;
    const lng = coords.longitude;

    // Check if coordinates correspond to Amazon rainforest region (-15 to 5 lat, -75 to -50 lng)
    const isAmazon = lat >= -15 && lat <= 5 && lng >= -75 && lng <= -50;
    // Check if coordinates correspond to Spain / Mediterranean region (36 to 44 lat, -10 to 4 lng)
    const isMediterranean = lat >= 36 && lat <= 44 && lng >= -10 && lng <= 4;

    if (isAmazon) {
      return {
        fuelClass: 'Dense Tropical Rainforest (Primary Canopy)',
        burnabilityFactor: 0.95,
        fuelLoadTonsPerHectare: 180,
        isBurnable: true,
        source: 'ESA WorldCover / NASA MODIS Land Cover (Forest)'
      };
    } else if (isMediterranean) {
      return {
        fuelClass: 'Mediterranean Sclerophyllous Shrubland & Scrub',
        burnabilityFactor: 0.85,
        fuelLoadTonsPerHectare: 45,
        isBurnable: true,
        source: 'Copernicus CORINE Land Cover / ESA WorldCover'
      };
    }

    // Default temperate / mixed vegetation fuel mapping
    return {
      fuelClass: 'Mixed Forest & Grassland Corridor',
      burnabilityFactor: 0.75,
      fuelLoadTonsPerHectare: 60,
      isBurnable: true,
      source: 'ESA WorldCover 10m Global Land Cover'
    };
  }
}

export const fuelService = FuelService.getInstance();
