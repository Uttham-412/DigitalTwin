# Land8Fire — Real-World 3D Wildfire Digital Twin

Land8Fire is a real-world, interactive, browser-based 3D wildfire Digital Twin built with **React**, **TypeScript**, **Vite**, and **CesiumJS**.

It provides a high-performance 3D geospatial experience for visualizing satellite observations, AI-predicted burned area masks, environmental variables, and simulated fire spread over real geographic terrain.

---

## 🚀 Architecture Overview

```
Land8Fire Digital Twin
├── Web UI / React 18 + TypeScript + Vite
├── 3D Geospatial Engine / CesiumJS + Cesium Ion
├── Real-World Terrain & Global Satellite Imagery
├── Geospatial Engine (CRS, Affine Transforms, GeoJSON, Rasters)
└── ML Integration Interface (U-Net Burned Area Segmentation API)
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons
- **3D Geospatial Engine**: CesiumJS (with `vite-plugin-cesium`)
- **GIS / Mapping**: Cesium Ion World Terrain, Satellite Imagery, GeoJSON, EPSG Transform Pipeline
- **Styling**: Obsidian Dark-Mode Glassmorphism Design System (Vanilla CSS)

---

## ⚙️ Environment & Cesium Ion Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your **Cesium Ion Access Token**:
   ```env
   VITE_CESIUM_ION_ACCESS_TOKEN=your_cesium_ion_token_here
   ```
   > **Note**: `.env.local` is ignored by Git and will never be committed or printed.

---

## 📦 Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Type check & build production bundle
npm run build
```

---

## 🔬 Scientific Data Architecture

Every data product in Land8Fire is strictly classified into one of four scientific categories:

1. **OBSERVED DATA**: Measured satellite imagery, ground telemetry, official wildfire labels.
2. **DERIVED DATA**: ML model outputs (U-Net burned-area predictions), calculated NDVI/vegetation indices.
3. **SIMULATED DATA**: Projected future fire spread, scenario risk calculations.
4. **RECONSTRUCTED DATA**: 3D visual representations of vegetation and structures.

---

## 🔮 Future Integration Pipeline

### U-Net Model Integration
The existing U-Net segmentation model outputs 256×256 probability maps for historical wildfire patches (such as `EMSR239_05ALMADENDELAPLATAOVERVIEW`).
The Digital Twin connects these predictions via a REST/GeoJSON interface:
`Raster Probability Map → Thresholding → Geographic Coordinate Transform → Cesium 3D Layer`
