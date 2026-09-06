from pyproj import Transformer

# Transformer from EPSG:32630 (UTM Zone 30N) to EPSG:4326 (WGS84 Lat/Lng)
transformer = Transformer.from_crs("EPSG:32630", "EPSG:4326", always_xy=True)

# Patch 433 UTM bounds
x_min, y_max = 745470.0, 4199790.0
x_max, y_min = 750590.0, 4194670.0
x_center, y_center = 748030.0, 4197230.0

# Convert UL, LR, and Center
lng_ul, lat_ul = transformer.transform(x_min, y_max)
lng_lr, lat_lr = transformer.transform(x_max, y_min)
lng_center, lat_center = transformer.transform(x_center, y_center)

print("=== PATCH 433 EXACT GEOGRAPHIC RECONSTRUCTION ===")
print(f"CRS: EPSG:32630 (UTM Zone 30N) -> EPSG:4326 (WGS84)")
print(f"Upper-Left (UL) UTM: ({x_min:.1f}, {y_max:.1f}) -> WGS84: {lat_ul:.6f}° N, {abs(lng_ul):.6f}° W ({lat_ul:.6f}, {lng_ul:.6f})")
print(f"Lower-Right (LR) UTM: ({x_max:.1f}, {y_min:.1f}) -> WGS84: {lat_lr:.6f}° N, {abs(lng_lr):.6f}° W ({lat_lr:.6f}, {lng_lr:.6f})")
print(f"Center UTM: ({x_center:.1f}, {y_center:.1f}) -> WGS84: {lat_center:.6f}° N, {abs(lng_center):.6f}° W ({lat_center:.6f}, {lng_center:.6f})")
print(f"Bounding Box WGS84: West={lng_ul:.6f}, South={lat_lr:.6f}, East={lng_lr:.6f}, North={lat_ul:.6f}")
