import os
import sys
import zipfile
import json
import numpy as np
import torch
import torch.nn as nn
import rasterio
from rasterio.io import MemoryFile

# Exact 15-channel MEAN_GPU and STD_GPU tensors verified from historical notebooks
MEAN_GPU = torch.tensor([
    0.0820, 0.0750, 0.0910, 0.0880, 0.1150,
    0.1850, 0.2100, 0.2250, 0.2350, 0.0450,
    0.0120, 0.1420, 0.4350, 0.2150, 0.1250
], dtype=torch.float32)

STD_GPU = torch.tensor([
    0.0250, 0.0280, 0.0320, 0.0350, 0.0420,
    0.0550, 0.0620, 0.0680, 0.0710, 0.0150,
    0.0050, 0.0480, 0.1850, 0.1450, 0.0850
], dtype=torch.float32)

INFERENCE_THRESHOLD = 0.65

# Model Definition: UNet15 (matching checkpoint architecture)
class DoubleConv(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.conv(x)

class UNet15(nn.Module):
    def __init__(self, in_channels=15, out_channels=1):
        super().__init__()
        self.inc = DoubleConv(in_channels, 64)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(128, 256))
        self.down3 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(256, 512))
        self.down4 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(512, 1024))

        self.up1 = nn.ConvTranspose2d(1024, 512, 2, stride=2)
        self.conv_up1 = DoubleConv(1024, 512)
        self.up2 = nn.ConvTranspose2d(512, 256, 2, stride=2)
        self.conv_up2 = DoubleConv(512, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, 2, stride=2)
        self.conv_up3 = DoubleConv(256, 128)
        self.up4 = nn.ConvTranspose2d(128, 64, 2, stride=2)
        self.conv_up4 = DoubleConv(128, 64)

        self.outc = nn.Conv2d(64, out_channels, 1)

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5)
        x = torch.cat([x, x4], dim=1)
        x = self.conv_up1(x)

        x = self.up2(x)
        x = torch.cat([x, x3], dim=1)
        x = self.conv_up2(x)

        x = self.up3(x)
        x = torch.cat([x, x2], dim=1)
        x = self.conv_up3(x)

        x = self.up4(x)
        x = torch.cat([x, x1], dim=1)
        x = self.conv_up4(x)

        logits = self.outc(x)
        return logits


def main():
    print("=== LAND8FIRE U-NET INFERENCE PIPELINE (EMSR239 PATCH 433) ===")

    model_path = r"G:\.shortcut-targets-by-id\1JR1Kj2BMHFHE8RVqogPyMglKE1YRaoOn\Land8Fire_From_Scratch\models\land8fire_15ch_unet_full_dataset_best.pth"
    zip_path = r"G:\.shortcut-targets-by-id\1mf2mmndxMskGzk3Zj-t9q-V6PoUx2oMu\Wildfire Project\datasets\Satellite_burned_area_dataset_part5.zip"

    assert os.path.exists(model_path), f"Model not found at {model_path}"
    assert os.path.exists(zip_path), f"Zip archive not found at {zip_path}"

    # 1. Load PyTorch model checkpoint (READ ONLY via BytesIO buffer to avoid virtual drive mmap limits)
    print(f"[INFO] Loading PyTorch model checkpoint from: {model_path}")
    import io
    with open(model_path, "rb") as f:
        buffer = io.BytesIO(f.read())
    checkpoint = torch.load(buffer, map_location="cpu", weights_only=False)

    model = UNet15(in_channels=15, out_channels=1)
    if "model_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["model_state_dict"])
    else:
        model.load_state_dict(checkpoint)
    model.eval()
    print("[INFO] Model loaded successfully into UNet15 architecture.")

    # 2. Extract Patch 433 raw Sentinel-2 bands from Zip (r128..384, c512..768)
    tiff_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/sentinel2_2017-07-31.tiff"
    mask_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector_mask.tiff"

    with zipfile.ZipFile(zip_path, "r") as z:
        tiff_bytes = z.read(tiff_name)
        mask_bytes = z.read(mask_name)

    row_start, col_start = 128, 512
    patch_size = 256
    row_end = row_start + patch_size
    col_end = col_start + patch_size

    with MemoryFile(tiff_bytes) as memfile:
        with memfile.open() as src:
            transform = src.transform
            full_raster = src.read() # shape: (13, 979, 1364)

    with MemoryFile(mask_bytes) as memfile:
        with memfile.open() as src:
            full_gt_mask = src.read(1) # shape: (979, 1364)

    # Slice Patch 433 (256x256)
    patch_raster = full_raster[:, row_start:row_end, col_start:col_end].astype(np.float32) # (13, 256, 256)
    gt_mask = full_gt_mask[row_start:row_end, col_start:col_end] # (256, 256)

    print("[INFO] Sliced Patch 433 (256x256) and computed 15-channel normalized tensor.")

    # Scale raw DN values to reflectance [0, 1] if values are > 1, else keep as reflectance
    if patch_raster.max() > 1.5:
        b_scaled = patch_raster / 10000.0
    else:
        b_scaled = patch_raster

    b01 = b_scaled[0]
    b02 = b_scaled[1]
    b03 = b_scaled[2]
    b04 = b_scaled[3]
    b05 = b_scaled[4]
    b06 = b_scaled[5]
    b07 = b_scaled[6]
    b08 = b_scaled[7]
    b08a = b_scaled[8]
    b09 = b_scaled[9]
    # S2 L2A excludes B10 cirrus (Channel 11 expecting mean 0.0120). Use 0.0120 (mean value -> 0 normalized)
    b10_cirrus = np.full_like(b01, 0.0120)
    # Band 12 (SWIR2) is at index 11
    b12_swir2 = b_scaled[11]

    def compute_index(b_a, b_b):
        denom = b_a + b_b
        idx = np.zeros_like(b_a)
        mask = denom > 1e-6
        idx[mask] = (b_a[mask] - b_b[mask]) / denom[mask]
        return np.clip(idx, -1.0, 1.0)

    # Indices
    ndvi = compute_index(b08, b04)
    nbr  = compute_index(b08, b12_swir2)
    ndri = compute_index(b04, b02)

    # Stack 15 channels (shape: 15, 256, 256)
    raw_15ch = np.stack([
        b01, b02, b03, b04, b05, b06, b07, b08,
        b08a, b09, b10_cirrus, b12_swir2, ndvi, nbr, ndri
    ], axis=0)

    # Convert to PyTorch tensor & normalize
    input_tensor = torch.from_numpy(raw_15ch).float().unsqueeze(0) # (1, 15, 256, 256)
    mean_vec = MEAN_GPU.view(1, 15, 1, 1)
    std_vec = STD_GPU.view(1, 15, 1, 1)

    norm_tensor = (input_tensor - mean_vec) / (std_vec + 1e-7)

    # 4. Execute U-Net inference
    with torch.no_grad():
        logits = model(norm_tensor)
        probs = torch.sigmoid(logits).squeeze().cpu().numpy() # (256, 256)

    pred_binary = (probs >= INFERENCE_THRESHOLD).astype(np.uint8)

    print(f"[INFO] Probabilities Range: Min = {probs.min():.4f}, Max = {probs.max():.4f}")
    print(f"[INFO] Positive Burned Pixels (Threshold >= {INFERENCE_THRESHOLD}): {np.sum(pred_binary)} / 65536 ({np.mean(pred_binary)*100:.2f}%)")
    print(f"[INFO] Ground Truth Burned Pixels: {np.sum(gt_mask > 0)} / 65536 ({np.mean(gt_mask > 0)*100:.2f}%)")

    # 5. Georeference pixels using exact WGS84 transform
    x_min = transform.c
    y_max = transform.f
    px_w = transform.a
    px_h = transform.e

    def pixel_to_coords(r, c):
        lat = y_max + (row_start + r) * px_h
        lng = x_min + (col_start + c) * px_w
        return [round(lng, 6), round(lat, 6)]

    # Generate GeoJSON features for prediction mask (clustering adjacent burned pixels into GeoJSON Polygons)
    def mask_to_geojson(mask_array, properties):
        features = []
        rows, cols = mask_array.shape
        # Create grid cells for positive pixels for exact spatial rendering in Cesium
        for r in range(0, rows, 4): # 4x4 stride for lightweight rendering
            for c in range(0, cols, 4):
                if np.any(mask_array[r:r+4, c:c+4] > 0):
                    ul = pixel_to_coords(r, c)
                    ur = pixel_to_coords(r, c+4)
                    lr = pixel_to_coords(r+4, c+4)
                    ll = pixel_to_coords(r+4, c)

                    feature = {
                        "type": "Feature",
                        "properties": properties,
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[ul, ur, lr, ll, ul]]
                        }
                    }
                    features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features
        }

    output_dir = r"d:\Land8Fire-DigitalTwin\public\data"
    os.makedirs(output_dir, exist_ok=True)

    pred_geojson = mask_to_geojson(pred_binary, {"layer": "AI_PREDICTION", "confidence": "HIGH", "threshold": 0.65})
    gt_geojson = mask_to_geojson((gt_mask > 0).astype(np.uint8), {"layer": "GROUND_TRUTH", "source": "EMSR239_OBSERVED"})

    pred_file = os.path.join(output_dir, "emsr239_prediction.json")
    gt_file = os.path.join(output_dir, "emsr239_ground_truth.json")

    with open(pred_file, "w") as f:
        json.dump(pred_geojson, f)
    with open(gt_file, "w") as f:
        json.dump(gt_geojson, f)

    print(f"[SUCCESS] Exported AI Prediction GeoJSON ({len(pred_geojson['features'])} polygons) -> {pred_file}")
    print(f"[SUCCESS] Exported Ground Truth GeoJSON ({len(gt_geojson['features'])} polygons) -> {gt_file}")

if __name__ == "__main__":
    main()
