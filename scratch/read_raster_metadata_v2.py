import zipfile
import rasterio
from rasterio.io import MemoryFile

zip_path = r"G:\.shortcut-targets-by-id\1mf2mmndxMskGzk3Zj-t9q-V6PoUx2oMu\Wildfire Project\datasets\Satellite_burned_area_dataset_part5.zip"
tiff_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/sentinel2_2017-07-31.tiff"
mask_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector_mask.tiff"

with zipfile.ZipFile(zip_path, 'r') as z:
    tiff_bytes = z.read(tiff_name)
    mask_bytes = z.read(mask_name)

with MemoryFile(tiff_bytes) as memfile:
    with memfile.open() as src:
        transform = src.transform
        width = src.width
        height = src.height
        crs = src.crs
        count = src.count

        x_min = transform.c
        y_max = transform.f
        px_w = transform.a
        px_h = transform.e # Negative value

        x_max = x_min + width * px_w
        y_min = y_max + height * px_h

        print("=== EMSR239 ORIGINAL SOURCE RASTER METADATA ===")
        print(f"Filename: {tiff_name}")
        print(f"Width x Height: {width} x {height} pixels")
        print(f"Bands: {count}")
        print(f"CRS: {crs}")
        print(f"Affine Transform: c={x_min}, f={y_max}, a={px_w}, e={px_h}")
        print(f"Upper-Left (UL): Lat {y_max:.6f}, Lng {x_min:.6f}")
        print(f"Lower-Right (LR): Lat {y_min:.6f}, Lng {x_max:.6f}")
        print(f"Bounding Box WGS84: West={x_min:.6f}, South={y_min:.6f}, East={x_max:.6f}, North={y_max:.6f}")

        # Patch 433: row = 128, col = 512, size = 256 x 256
        row_start = 128
        col_start = 512
        patch_size = 256

        row_end = row_start + patch_size
        col_end = col_start + patch_size

        p_x_min = x_min + col_start * px_w
        p_y_max = y_max + row_start * px_h
        p_x_max = x_min + col_end * px_w
        p_y_min = y_max + row_end * px_h

        p_center_lng = (p_x_min + p_x_max) / 2.0
        p_center_lat = (p_y_min + p_y_max) / 2.0

        print("\n=== PATCH 433 EXACT GEOGRAPHIC RECONSTRUCTION ===")
        print(f"Patch ID: TEST_EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector_r128_c512")
        print(f"Row Range: [{row_start}, {row_end}] | Column Range: [{col_start}, {col_end}]")
        print(f"Upper-Left (UL): Lat {p_y_max:.6f}° N, Lng {p_x_min:.6f}° W ({p_y_max:.6f}, {p_x_min:.6f})")
        print(f"Lower-Right (LR): Lat {p_y_min:.6f}° N, Lng {p_x_max:.6f}° W ({p_y_min:.6f}, {p_x_max:.6f})")
        print(f"Center Coordinate: Lat {p_center_lat:.6f}° N, Lng {p_center_lng:.6f}° W ({p_center_lat:.6f}, {p_center_lng:.6f})")
        print(f"Bounding Box WGS84: West={p_x_min:.6f}, South={p_y_min:.6f}, East={p_x_max:.6f}, North={p_y_max:.6f}")
