import {
  Coordinates,
  EnvironmentalObservation,
  EnvironmentalTimeline,
  EnvironmentalProvenance,
  degreesToCardinal
} from './environmentalTypes';

class EnvironmentalService {
  private static instance: EnvironmentalService;
  private cache: Map<string, { timeline: EnvironmentalTimeline; cachedAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  public static getInstance(): EnvironmentalService {
    if (!EnvironmentalService.instance) {
      EnvironmentalService.instance = new EnvironmentalService();
    }
    return EnvironmentalService.instance;
  }

  /**
   * Fetch time-aware hourly environmental timeline for specified coordinates.
   */
  public async fetchEnvironmentalTimeline(
    coords: Coordinates,
    locationName?: string
  ): Promise<EnvironmentalTimeline> {
    const lat = Number(coords.latitude.toFixed(2));
    const lng = Number(coords.longitude.toFixed(2));
    const cacheKey = `${lat}_${lng}`;

    // 1. Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return {
        ...cached.timeline,
        locationName: locationName || cached.timeline.locationName
      };
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,cloud_cover&past_days=1&forecast_days=2&timezone=UTC`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API HTTP Error ${response.status}`);
      }

      const data = await response.json();
      if (!data.hourly || !data.hourly.time) {
        throw new Error('Invalid response structure from weather provider.');
      }

      const times: string[] = data.hourly.time;
      const temps: number[] = data.hourly.temperature_2m;
      const humidities: number[] = data.hourly.relative_humidity_2m;
      const windSpeeds: number[] = data.hourly.wind_speed_10m;
      const windDirs: number[] = data.hourly.wind_direction_10m;
      const precip: number[] = data.hourly.precipitation;
      const pressure: number[] = data.hourly.surface_pressure;
      const clouds: number[] = data.hourly.cloud_cover;

      const nowIso = new Date().toISOString();
      const observations: EnvironmentalObservation[] = [];

      for (let i = 0; i < times.length; i++) {
        const timeIso = `${times[i]}:00Z`;
        const dateObj = new Date(timeIso);

        const isPastOrCurrent = timeIso <= nowIso;
        const provenance = isPastOrCurrent
          ? EnvironmentalProvenance.OBSERVED
          : EnvironmentalProvenance.FORECAST;

        const formattedTime = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const formattedDate = dateObj.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        });

        observations.push({
          location: { latitude: lat, longitude: lng },
          locationName: locationName || `Lat ${lat}°, Lng ${lng}°`,
          timestamp: timeIso,
          formattedTime: `${formattedDate}, ${formattedTime}`,
          temperature: temps[i] ?? 0,
          relativeHumidity: humidities[i] ?? 0,
          windSpeed: windSpeeds[i] ?? 0,
          windDirection: windDirs[i] ?? 0,
          windDirectionCardinal: degreesToCardinal(windDirs[i] ?? 0),
          precipitation: precip[i] ?? 0,
          surfacePressure: pressure[i] ?? 1013,
          cloudCover: clouds[i] ?? 0,
          provenance,
          source: 'Open-Meteo (ICON / ECMWF Open Data)'
        });
      }

      // Find index closest to current hour
      const nowMs = Date.now();
      let selectedIndex = 0;
      let minDiff = Infinity;

      for (let i = 0; i < observations.length; i++) {
        const obsMs = new Date(observations[i].timestamp).getTime();
        const diff = Math.abs(nowMs - obsMs);
        if (diff < minDiff) {
          minDiff = diff;
          selectedIndex = i;
        }
      }

      const timeline: EnvironmentalTimeline = {
        location: { latitude: lat, longitude: lng },
        locationName: locationName || `Lat ${lat}°, Lng ${lng}°`,
        observations,
        selectedIndex,
        lastUpdated: new Date().toISOString(),
        isAvailable: true
      };

      // Save to cache
      this.cache.set(cacheKey, { timeline, cachedAt: Date.now() });
      return timeline;
    } catch (err: any) {
      console.warn('Environmental Service fetch failed:', err.message);
      return {
        location: { latitude: lat, longitude: lng },
        locationName,
        observations: [],
        selectedIndex: 0,
        lastUpdated: new Date().toISOString(),
        isAvailable: false,
        errorMessage: err.message || 'ENVIRONMENTAL DATA UNAVAILABLE'
      };
    }
  }
}

export const environmentalService = EnvironmentalService.getInstance();
