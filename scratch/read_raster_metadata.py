import zipfile
import io

try:
    import rasterio
    from rasterio.io import MemoryFile
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

try:
    import tifffile
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False

zip_path = r"G:\.shortcut-targets-by-id\1mf2mmndxMskGzk3Zj-t9q-V6PoUx2oMu\Wildfire Project\datasets\Satellite_burned_area_dataset_part5.zip"
tiff_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/sentinel2_2017-07-31.tiff"
mask_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector_mask.tiff"

print(f"HAS_RASTERIO: {HAS_RASTERIO}, HAS_TIFFFILE: {HAS_TIFFFILE}")

with zipfile.ZipFile(zip_path, 'r') as z:
    tiff_bytes = z.read(tiff_name)
    mask_bytes = z.read(mask_name)

if HAS_RASTERIO:
    with MemoryFile(tiff_bytes) as memfile:
        with memfile.open() as src:
            print("\n=== SENTINEL-2 RASTER METADATA (sentinel2_2017-07-31.tiff) ===")
            print(f"Width x Height: {src.width} x {src.height}")
            print(f"Bands: {src.count}")
            print(f"CRS: {src.crs}")
            print(f"Transform (Affine): {src.transform}")
            print(f"Bounds: {src.bounds}")
            print(f"Dtypes: {src.dtypes}")

    with MemoryFile(mask_bytes) as memfile:
        with memfile.open() as src:
            print("\n=== EMSR239 GROUND TRUTH MASK METADATA ===")
            print(f"Width x Height: {src.width} x {src.height}")
            print(f"Bands: {src.count}")
            print(f"CRS: {src.crs}")
            print(f"Transform (Affine): {src.transform}")
            print(f"Bounds: {src.bounds}")
