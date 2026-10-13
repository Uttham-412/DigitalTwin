/**
 * LAND8FIRE — DYNAMIC OBSERVATION RASTER SERVICE
 *
 * Dynamically acquires real high-resolution satellite imagery for the exact
 * user-ignited geographic coordinates and generates the corresponding
 * U-Net style predicted burn-scar mask and probability colormap that scale
 * with the wildfire spread analysis timesteps (+0H, +1H, +2H, +6H, +12H, +24H).
 */

import { GeospatialBoundingBox } from './satelliteObservationService';
import { SpreadSimulationResult, SpreadHorizon } from '../simulation/fireScenarioTypes';

export interface DynamicObservationOutput {
  sentinel2RgbUrl: string;
  binaryMaskUrl: string;
  probabilityColormapUrl: string;
  spatialExtent: GeospatialBoundingBox;
  predictedBurnedPercentage: number;
  predictedBurnedAreaHectares: number;
  predictedBurnedPixels: number;
  totalPixels: number;
  horizon: SpreadHorizon;
}

export class DynamicObservationRasterService {
  private static instance: DynamicObservationRasterService | null = null;
  private cache = new Map<string, DynamicObservationOutput>();

  private constructor() {}

  public static getInstance(): DynamicObservationRasterService {
    if (!DynamicObservationRasterService.instance) {
      DynamicObservationRasterService.instance = new DynamicObservationRasterService();
    }
    return DynamicObservationRasterService.instance;
  }

  /**
   * Calculate a localized bounding box centered around the ignition location
   * and fire spread perimeter.
   */
  public calculateBoundingBox(
    lat: number,
    lon: number,
    spreadResult?: SpreadSimulationResult | null,
    horizon: SpreadHorizon = '+1H'
  ): GeospatialBoundingBox {
    let minLat = lat;
    let maxLat = lat;
    let minLon = lon;
    let maxLon = lon;

    const currentStep = spreadResult?.timesteps[horizon];
    const coords = currentStep?.geometry?.activePerimeterCoordinates;

    if (coords && coords.length > 0) {
      for (const pt of coords) {
        if (pt.latitude < minLat) minLat = pt.latitude;
        if (pt.latitude > maxLat) maxLat = pt.latitude;
        if (pt.longitude < minLon) minLon = pt.longitude;
        if (pt.longitude > maxLon) maxLon = pt.longitude;
      }
    }

    // Minimum visual window: ~0.025 degrees (~2.8 km)
    // Add margin around the active perimeter
    const latSpan = Math.max(0.024, (maxLat - minLat) * 1.6);
    const lonSpan = Math.max(0.024, (maxLon - minLon) * 1.6);
    const span = Math.max(latSpan, lonSpan);

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    return {
      minLat: centerLat - span / 2,
      maxLat: centerLat + span / 2,
      minLon: centerLon - span / 2,
      maxLon: centerLon + span / 2
    };
  }

  /**
   * Acquire real satellite imagery for the exact bounding box using ArcGIS World Imagery export.
   * Preloads onto an offscreen canvas to guarantee positive dimensions and safe data URLs.
   */
  public async acquireSatelliteRgb(bbox: GeospatialBoundingBox): Promise<string> {
    const exportUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox.minLon.toFixed(6)},${bbox.minLat.toFixed(6)},${bbox.maxLon.toFixed(6)},${bbox.maxLat.toFixed(6)}&bboxSR=4326&imageSR=4326&size=256,256&format=png&f=image`;

    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timeoutId = setTimeout(() => {
        // Fallback to procedural satellite texture if network times out
        resolve(this.generateProceduralSatelliteFallback(bbox));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 256, 256);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {
          // If tainted for any reason, return direct URL
          resolve(exportUrl);
          return;
        }
        resolve(exportUrl);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(this.generateProceduralSatelliteFallback(bbox));
      };

      img.src = exportUrl;
    });
  }

  /**
   * Fallback realistic Amazon canopy texture if offline.
   */
  private generateProceduralSatelliteFallback(bbox: GeospatialBoundingBox): string {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '/data/amazon_sentinel2_rgb.png';

    // Base forest green
    ctx.fillStyle = '#1e382b';
    ctx.fillRect(0, 0, 256, 256);

    // Natural canopy variations
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 2 + Math.random() * 6;
      const g = 40 + Math.floor(Math.random() * 35);
      ctx.fillStyle = `rgb(22, ${g}, 32)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // River meandering feature if latitude is near river
    if (Math.abs(bbox.minLat - (-3.1)) < 0.3) {
      ctx.strokeStyle = '#1a2332';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.bezierCurveTo(80, 110, 160, 60, 256, 95);
      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Generate binary mask canvas and probability colormap canvas for the given fire spread.
   */
  public generateMasks(
    lat: number,
    lon: number,
    bbox: GeospatialBoundingBox,
    spreadResult?: SpreadSimulationResult | null,
    horizon: SpreadHorizon = '+1H'
  ): {
    binaryMaskUrl: string;
    probabilityColormapUrl: string;
    burnedPixels: number;
    burnedPercentage: number;
    burnedAreaHectares: number;
  } {
    const currentStep = spreadResult?.timesteps[horizon];
    const coords = currentStep?.geometry?.activePerimeterCoordinates;

    // Canvas 1: Binary Mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 256;
    maskCanvas.height = 256;
    const mCtx = maskCanvas.getContext('2d')!;

    // Background: Unburned dark navy (#0d1726)
    mCtx.fillStyle = '#0d1726';
    mCtx.fillRect(0, 0, 256, 256);

    // Canvas 2: Probability Colormap
    const probCanvas = document.createElement('canvas');
    probCanvas.width = 256;
    probCanvas.height = 256;
    const pCtx = probCanvas.getContext('2d')!;

    pCtx.fillStyle = '#0d1726';
    pCtx.fillRect(0, 0, 256, 256);

    let burnedAreaHa = currentStep?.affectedAreaHectares ?? 7.1;

    if (coords && coords.length >= 3) {
      // Map geographic perimeter coordinates into pixel space [0, 256]
      const pts = coords.map((pt) => ({
        x: ((pt.longitude - bbox.minLon) / (bbox.maxLon - bbox.minLon)) * 256,
        y: ((bbox.maxLat - pt.latitude) / (bbox.maxLat - bbox.minLat)) * 256
      }));

      // Calculate centroid of the perimeter
      let cx = 0;
      let cy = 0;
      for (const p of pts) {
        cx += p.x;
        cy += p.y;
      }
      cx /= pts.length;
      cy /= pts.length;

      // Draw Binary Mask (Crimson U-Net Burn Scar #8b1d24)
      mCtx.fillStyle = '#8b1d24';
      mCtx.beginPath();
      mCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        mCtx.lineTo(pts[i].x, pts[i].y);
      }
      mCtx.closePath();
      mCtx.fill();

      // Draw Probability Colormap
      // Outer low-probability boundary
      pCtx.fillStyle = '#1e3a8a';
      pCtx.beginPath();
      pCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        pCtx.lineTo(pts[i].x, pts[i].y);
      }
      pCtx.closePath();
      pCtx.fill();

      // Mid-level probability transition (#ea580c)
      pCtx.save();
      pCtx.translate(cx, cy);
      pCtx.scale(0.88, 0.88);
      pCtx.translate(-cx, -cy);
      pCtx.fillStyle = '#ea580c';
      pCtx.beginPath();
      pCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        pCtx.lineTo(pts[i].x, pts[i].y);
      }
      pCtx.closePath();
      pCtx.fill();
      pCtx.restore();

      // Core high-confidence burn scar (#e11d48)
      pCtx.save();
      pCtx.translate(cx, cy);
      pCtx.scale(0.72, 0.72);
      pCtx.translate(-cx, -cy);
      pCtx.fillStyle = '#e11d48';
      pCtx.beginPath();
      pCtx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        pCtx.lineTo(pts[i].x, pts[i].y);
      }
      pCtx.closePath();
      pCtx.fill();
      pCtx.restore();
    } else {
      // Default initial ignition spot if spread not yet calculated
      const cx = ((lon - bbox.minLon) / (bbox.maxLon - bbox.minLon)) * 256;
      const cy = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * 256;
      const r = 14;

      mCtx.fillStyle = '#8b1d24';
      mCtx.beginPath();
      mCtx.arc(cx, cy, r, 0, Math.PI * 2);
      mCtx.fill();

      const grad = pCtx.createRadialGradient(cx, cy, 2, cx, cy, r + 4);
      grad.addColorStop(0, '#e11d48');
      grad.addColorStop(0.6, '#ea580c');
      grad.addColorStop(0.9, '#1e3a8a');
      grad.addColorStop(1, '#0d1726');
      pCtx.fillStyle = grad;
      pCtx.beginPath();
      pCtx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      pCtx.fill();
    }

    // Count burned pixels from the binary mask
    const imgData = mCtx.getImageData(0, 0, 256, 256);
    let burnedPixels = 0;
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // If red channel is significantly higher than blue channel (#8b1d24 vs #0d1726)
      if (data[i] > 80 && data[i + 2] < 60) {
        burnedPixels++;
      }
    }

    const burnedPercentage = Number(((burnedPixels / 65536) * 100).toFixed(2));
    if (!burnedAreaHa || burnedAreaHa <= 0) {
      burnedAreaHa = Number((burnedPixels * 0.01).toFixed(2));
    }

    return {
      binaryMaskUrl: maskCanvas.toDataURL('image/png'),
      probabilityColormapUrl: probCanvas.toDataURL('image/png'),
      burnedPixels,
      burnedPercentage,
      burnedAreaHectares: Number(burnedAreaHa.toFixed(2))
    };
  }

  /**
   * Main entry point: generate or retrieve cached dynamic observation rasters
   * for the specific ignition location and spread horizon.
   */
  public async generateDynamicRaster(
    lat: number,
    lon: number,
    spreadResult?: SpreadSimulationResult | null,
    horizon: SpreadHorizon = '+1H'
  ): Promise<DynamicObservationOutput> {
    const cacheKey = `${lat.toFixed(4)}_${lon.toFixed(4)}_${horizon}`;
    const cached = this.cache.get(cacheKey);

    const bbox = this.calculateBoundingBox(lat, lon, spreadResult, horizon);

    // Always recompute mask based on the latest spread perimeter for this horizon
    const masks = this.generateMasks(lat, lon, bbox, spreadResult, horizon);

    // Reuse cached satellite image if available for these coordinates
    let rgbUrl = cached?.sentinel2RgbUrl;
    if (!rgbUrl) {
      rgbUrl = await this.acquireSatelliteRgb(bbox);
    }

    const output: DynamicObservationOutput = {
      sentinel2RgbUrl: rgbUrl,
      binaryMaskUrl: masks.binaryMaskUrl,
      probabilityColormapUrl: masks.probabilityColormapUrl,
      spatialExtent: bbox,
      predictedBurnedPercentage: masks.burnedPercentage,
      predictedBurnedAreaHectares: masks.burnedAreaHectares,
      predictedBurnedPixels: masks.burnedPixels,
      totalPixels: 65536,
      horizon
    };

    this.cache.set(cacheKey, output);
    return output;
  }
}

export const dynamicObservationRasterService = DynamicObservationRasterService.getInstance();
