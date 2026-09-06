import zipfile
import io
import os

zip_path = r"G:\.shortcut-targets-by-id\1mf2mmndxMskGzk3Zj-t9q-V6PoUx2oMu\Wildfire Project\datasets\Satellite_burned_area_dataset_part5.zip"

print(f"Checking zip exists: {os.path.exists(zip_path)}")

if os.path.exists(zip_path):
    with zipfile.ZipFile(zip_path, 'r') as z:
        namelist = z.namelist()
        emsr_files = [f for f in namelist if 'EMSR239' in f]
        print(f"Found {len(emsr_files)} EMSR239 files in zip:")
        for f in emsr_files:
            print(" ", f)

        # Inspect TIFF header if rasterio/tifffile is available
        tiff_name = "Satellite_burned_area_dataset_part5/EMSR239_05ALMADENDELAPLATAOVERVIEW_02GRADING_MAP_v1_vector/sentinel2_2017-07-31.tiff"
        if tiff_name in z.namelist():
            info = z.getinfo(tiff_name)
            print(f"\nFound {tiff_name}: size={info.file_size} bytes")
