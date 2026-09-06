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
  private geocodeCache: Map<string, string> = new Map();
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  public static getInstance(): EnvironmentalService {
    if (!EnvironmentalService.instance) {
      EnvironmentalService.instance = new EnvironmentalService();
    }
    return EnvironmentalService.instance;
  }

  /**
   * Reverse geocode latitude/longitude to a human-readable location label using Nominatim with fallback.
   */
  public async reverseGeocode(coords: Coordinates): Promise<string> {
    const lat = Number(coords.latitude.toFixed(3));
    const lng = Number(coords.longitude.toFixed(3));
    const cacheKey = `${lat}_${lng}`;

    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey)!;
    }

    const fallbackLabel = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s fast timeout

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const parts = [
          addr.city || addr.town || addr.village || addr.county || addr.state_district,
          addr.state,
          addr.country
        ].filter(Boolean);

        const name = parts.length > 0 ? parts.join(', ') : fallbackLabel;
        this.geocodeCache.set(cacheKey, name);
        return name;
      }
    } catch {
      // Fallback silently to coordinate string on timeout / offline
    }

    this.geocodeCache.set(cacheKey, fallbackLabel);
    return fallbackLabel;
  }

  /**
   * Fetch time-aware hourly environmental timeline for specified location and optional event date.
   */
  public async fetchEnvironmentalTimeline(
    coords: Coordinates,
    locationName?: string,
    eventDate?: string
  ): Promise<EnvironmentalTimeline> {
    const lat = Number(coords.latitude.toFixed(4));
    const lng = Number(coords.longitude.toFixed(4));
    const dateKey = eventDate ? eventDate.substring(0, 10) : 'current';
    const cacheKey = `${lat}_${lng}_${dateKey}`;

    // 1. Check location-specific in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return {
        ...cached.timeline,
        locationName: locationName || cached.timeline.locationName
      };
    }

    try {
      let resolvedName = locationName;
      if (!resolvedName) {
        resolvedName = await this.reverseGeocode(coords);
      }

      // Check if historical event date is requested (e.g. EMSR239 date "2017-07-31" or FIRMS "2024-08-23")
      const isHistoricalRequest = !!(
        eventDate &&
        new Date(eventDate).getFullYear() < new Date().getFullYear() - 1
      );

      let url: string;
      if (isHistoricalRequest) {
        const targetDate = eventDate!.substring(0, 10);
        const dObj = new Date(targetDate);
        const prevD = new Date(dObj.getTime() - 86400000).toISOString().substring(0, 10);
        const nextD = new Date(dObj.getTime() + 86400000).toISOString().substring(0, 10);

        url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${prevD}&end_date=${nextD}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,cloud_cover&timezone=UTC`;
      } else {
        url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,cloud_cover&past_days=1&forecast_days=2&timezone=UTC`;
      }

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
        const timeIso = times[i].includes('T') ? `${times[i]}:00Z` : `${times[i]}T00:00:00Z`;
        const dateObj = new Date(timeIso);

        let provenance: EnvironmentalProvenance;
        if (isHistoricalRequest) {
          provenance = EnvironmentalProvenance.HISTORICAL;
        } else if (timeIso <= nowIso) {
          provenance = EnvironmentalProvenance.OBSERVED;
        } else {
          provenance = EnvironmentalProvenance.FORECAST;
        }

        const formattedTime = dateObj.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const formattedDate = dateObj.toLocaleDateString([], {
          year: isHistoricalRequest ? 'numeric' : undefined,
          month: 'short',
          day: 'numeric'
        });

        observations.push({
          location: { latitude: lat, longitude: lng },
          locationName: resolvedName,
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
          source: isHistoricalRequest
            ? 'Open-Meteo ERA5 Historical Archive Reanalysis'
            : 'Open-Meteo (ICON / ECMWF Open Data)'
        });
      }

      // Determine target timestamp matching index
      let targetMs = Date.now();
      if (eventDate) {
        targetMs = new Date(eventDate).getTime();
      }

      let selectedIndex = 0;
      let minDiff = Infinity;
      for (let i = 0; i < observations.length; i++) {
        const obsMs = new Date(observations[i].timestamp).getTime();
        const diff = Math.abs(targetMs - obsMs);
        if (diff < minDiff) {
          minDiff = diff;
          selectedIndex = i;
        }
      }

      const timeline: EnvironmentalTimeline = {
        location: { latitude: lat, longitude: lng },
        locationName: resolvedName,
        observations,
        selectedIndex,
        lastUpdated: new Date().toISOString(),
        isAvailable: true
      };

      // Save to location-and-date specific cache
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
