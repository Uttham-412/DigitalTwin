#!/usr/bin/env python3
"""
LAND8FIRE — 3D ASSET GENERATOR (glTF 2.0 Binary / .glb)

Generates clean, optimized, photorealistic 3D assets for the Wildfire Digital Twin:
1. Hardwood Tree (Trunk with buttress roots, scaffold boughs, multi-layered foliage canopy)
2. Conifer Tree (Tapering trunk, whorled descending branches, tiered needle pads)
3. Understory Bush (Multi-stem woody shrub with dense foliage)
4. Granite Boulder (Faceted river/ridge rock)
5. Ranger Station Cabin (Timber log walls, pitched gable roof, stone chimney, porch)
6. Fire Watchtower (4-legged timber framework, elevated observation deck & railings)

All assets are 100% self-contained, CC0 public domain, and saved to public/models/.
"""

import os
import math
import json
import struct

def build_glb(meshes, materials, nodes):
    """
    Constructs a valid binary glTF 2.0 (.glb) container from mesh primitives.
    meshes: list of dicts with:
      - 'positions': list of (x,y,z)
      - 'normals': list of (nx,ny,nz)
      - 'colors': list of (r,g,b) [optional]
      - 'indices': list of int (triangle indices)
      - 'material_index': int
    """
    binary_data = bytearray()
    buffer_views = []
    accessors = []
    gltf_meshes = []

    def align4(b):
        while len(b) % 4 != 0:
            b.append(0)

    for mesh_idx, m in enumerate(meshes):
        pos = m['positions']
        norm = m['normals']
        col = m.get('colors')
        idx = m['indices']
        mat_id = m.get('material_index', 0)

        # 1. Indices BufferView
        idx_offset = len(binary_data)
        idx_bytes = struct.pack(f'<{len(idx)}H', *idx)
        binary_data.extend(idx_bytes)
        align4(binary_data)
        idx_len = len(binary_data) - idx_offset

        buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_offset,
            "byteLength": idx_len,
            "target": 34963 # ELEMENT_ARRAY_BUFFER
        })
        idx_accessor_idx = len(accessors)
        accessors.append({
            "bufferView": len(buffer_views) - 1,
            "byteOffset": 0,
            "componentType": 5123, # UNSIGNED_SHORT
            "count": len(idx),
            "type": "SCALAR",
            "max": [max(idx)] if idx else [0],
            "min": [min(idx)] if idx else [0]
        })

        # 2. Positions BufferView
        pos_offset = len(binary_data)
        flat_pos = [coord for pt in pos for coord in pt]
        pos_bytes = struct.pack(f'<{len(flat_pos)}f', *flat_pos)
        binary_data.extend(pos_bytes)
        align4(binary_data)
        pos_len = len(binary_data) - pos_offset

        min_x = min(p[0] for p in pos) if pos else 0
        max_x = max(p[0] for p in pos) if pos else 0
        min_y = min(p[1] for p in pos) if pos else 0
        max_y = max(p[1] for p in pos) if pos else 0
        min_z = min(p[2] for p in pos) if pos else 0
        max_z = max(p[2] for p in pos) if pos else 0

        buffer_views.append({
            "buffer": 0,
            "byteOffset": pos_offset,
            "byteLength": pos_len,
            "target": 34962 # ARRAY_BUFFER
        })
        pos_accessor_idx = len(accessors)
        accessors.append({
            "bufferView": len(buffer_views) - 1,
            "byteOffset": 0,
            "componentType": 5126, # FLOAT
            "count": len(pos),
            "type": "VEC3",
            "max": [max_x, max_y, max_z],
            "min": [min_x, min_y, min_z]
        })

        # 3. Normals BufferView
        norm_offset = len(binary_data)
        flat_norm = [coord for n in norm for coord in n]
        norm_bytes = struct.pack(f'<{len(flat_norm)}f', *flat_norm)
        binary_data.extend(norm_bytes)
        align4(binary_data)
        norm_len = len(binary_data) - norm_offset

        buffer_views.append({
            "buffer": 0,
            "byteOffset": norm_offset,
            "byteLength": norm_len,
            "target": 34962 # ARRAY_BUFFER
        })
        norm_accessor_idx = len(accessors)
        accessors.append({
            "bufferView": len(buffer_views) - 1,
            "byteOffset": 0,
            "componentType": 5126, # FLOAT
            "count": len(norm),
            "type": "VEC3"
        })

        attributes = {
            "POSITION": pos_accessor_idx,
            "NORMAL": norm_accessor_idx
        }

        # 4. Colors BufferView (optional)
        if col:
            col_offset = len(binary_data)
            flat_col = [c for pt in col for c in pt]
            col_bytes = struct.pack(f'<{len(flat_col)}f', *flat_col)
            binary_data.extend(col_bytes)
            align4(binary_data)
            col_len = len(binary_data) - col_offset

            buffer_views.append({
                "buffer": 0,
                "byteOffset": col_offset,
                "byteLength": col_len,
                "target": 34962
            })
            col_accessor_idx = len(accessors)
            accessors.append({
                "bufferView": len(buffer_views) - 1,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(col),
                "type": "VEC3"
            })
            attributes["COLOR_0"] = col_accessor_idx

        gltf_meshes.append({
            "name": f"Mesh_{mesh_idx}",
            "primitives": [{
                "attributes": attributes,
                "indices": idx_accessor_idx,
                "material": mat_id,
                "mode": 4 # TRIANGLES
            }]
        })

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "Land8Fire 3D Botanical Asset Generator"
        },
        "scene": 0,
        "scenes": [{
            "nodes": list(range(len(nodes)))
        }],
        "nodes": nodes,
        "meshes": gltf_meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{
            "byteLength": len(binary_data)
        }]
    }

    json_str = json.dumps(gltf_json, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' ' # Space padding for JSON chunk

    # GLB Header (12 bytes)
    magic = 0x46546C67 # 'glTF'
    version = 2
    total_length = 12 + 8 + len(json_bytes) + 8 + len(binary_data)
    header = struct.pack('<III', magic, version, total_length)

    # Chunk 0: JSON
    chunk0_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # 'JSON'

    # Chunk 1: BIN
    chunk1_header = struct.pack('<II', len(binary_data), 0x004E4942) # 'BIN\0'

    return header + chunk0_header + json_bytes + chunk1_header + bytes(binary_data)

# GEOMETRIC PRIMITIVE GENERATORS

def generate_cylinder(r_bottom, r_top, height, segments=12, y_offset=0.0):
    positions, normals, indices = [], [], []
    for ring in range(2):
        y = y_offset + ring * height
        r = r_bottom if ring == 0 else r_top
        for s in range(segments):
            angle = (s / segments) * math.pi * 2
            x = math.cos(angle) * r
            z = math.sin(angle) * r
            positions.append((round(x, 4), round(y, 4), round(z, 4)))
            normals.append((round(math.cos(angle), 4), 0.0, round(math.sin(angle), 4)))

    for s in range(segments):
        next_s = (s + 1) % segments
        b0 = s
        b1 = next_s
        t0 = s + segments
        t1 = next_s + segments
        indices.extend([b0, b1, t1, b0, t1, t0])

    return positions, normals, indices

def generate_sphere(radius, u_segments=12, v_segments=8, center=(0,0,0)):
    positions, normals, indices = [], [], []
    cx, cy, cz = center
    for v in range(v_segments + 1):
        phi = (v / v_segments) * math.pi
        y = cy + math.cos(phi) * radius
        r_slice = math.sin(phi) * radius
        for u in range(u_segments):
            theta = (u / u_segments) * math.pi * 2
            x = cx + math.cos(theta) * r_slice
            z = cz + math.sin(theta) * r_slice
            positions.append((round(x, 4), round(y, 4), round(z, 4)))
            # normal pointing outward
            nx = math.cos(theta) * math.sin(phi)
            ny = math.cos(phi)
            nz = math.sin(theta) * math.sin(phi)
            normals.append((round(nx, 4), round(ny, 4), round(nz, 4)))

    for v in range(v_segments):
        for u in range(u_segments):
            next_u = (u + 1) % u_segments
            i0 = v * u_segments + u
            i1 = v * u_segments + next_u
            i2 = (v + 1) * u_segments + u
            i3 = (v + 1) * u_segments + next_u
            indices.extend([i0, i2, i3, i0, i3, i1])

    return positions, normals, indices

def generate_box(width, height, depth, center=(0,0,0)):
    cx, cy, cz = center
    hw, hh, hd = width / 2, height / 2, depth / 2
    # 6 faces * 4 vertices = 24 vertices
    positions, normals, indices = [], [], []
    faces = [
        ((0, 1, 0), [(cx-hw, cy+hh, cz-hd), (cx+hw, cy+hh, cz-hd), (cx+hw, cy+hh, cz+hd), (cx-hw, cy+hh, cz+hd)]), # Top
        ((0, -1, 0), [(cx-hw, cy-hh, cz+hd), (cx+hw, cy-hh, cz+hd), (cx+hw, cy-hh, cz-hd), (cx-hw, cy-hh, cz-hd)]), # Bottom
        ((0, 0, 1), [(cx-hw, cy-hh, cz+hd), (cx+hw, cy-hh, cz+hd), (cx+hw, cy+hh, cz+hd), (cx-hw, cy+hh, cz+hd)]), # Front
        ((0, 0, -1), [(cx+hw, cy-hh, cz-hd), (cx-hw, cy-hh, cz-hd), (cx-hw, cy+hh, cz-hd), (cx+hw, cy+hh, cz-hd)]), # Back
        ((1, 0, 0), [(cx+hw, cy-hh, cz+hd), (cx+hw, cy-hh, cz-hd), (cx+hw, cy+hh, cz-hd), (cx+hw, cy+hh, cz+hd)]), # Right
        ((-1, 0, 0), [(cx-hw, cy-hh, cz-hd), (cx-hw, cy-hh, cz+hd), (cx-hw, cy+hh, cz+hd), (cx-hw, cy+hh, cz-hd)]), # Left
    ]
    for n, pts in faces:
        base = len(positions)
        for pt in pts:
            positions.append((round(pt[0], 4), round(pt[1], 4), round(pt[2], 4)))
            normals.append(n)
        indices.extend([base, base+1, base+2, base, base+2, base+3])
    return positions, normals, indices

def merge_primitives(prim_list):
    all_pos, all_norm, all_idx = [], [], []
    for pos, norm, idx in prim_list:
        base = len(all_pos)
        all_pos.extend(pos)
        all_norm.extend(norm)
        all_idx.extend([i + base for i in idx])
    return all_pos, all_norm, all_idx

# ASSET DEFINITIONS

def create_hardwood_tree():
    """Realistic broadleaf hardwood tree with trunk, buttress roots, scaffold boughs, and layered canopy shelves"""
    # Trunk: Fluted buttressed base and tapering trunk (Height: 28m)
    trunk_prims = []
    # Buttress base
    trunk_prims.append(generate_cylinder(3.2, 1.8, 6.0, segments=12, y_offset=0.0))
    # Mid trunk
    trunk_prims.append(generate_cylinder(1.8, 1.2, 12.0, segments=10, y_offset=6.0))
    # Boughs
    bough_offsets = [
        ((-4.5, 20.0, -2.5), 1.0, 0.7, 7.0),
        ((4.2, 21.5, -3.0), 1.0, 0.7, 6.5),
        ((-2.0, 22.5, 4.0), 0.9, 0.6, 6.0),
        ((3.5, 23.5, 3.5), 0.9, 0.6, 6.0),
    ]
    for center, rb, rt, h in bough_offsets:
        trunk_prims.append(generate_cylinder(rb, rt, h, segments=8, y_offset=center[1]-h/2))

    t_pos, t_norm, t_idx = merge_primitives(trunk_prims)

    # Foliage: Layered asymmetric umbrella clouds (4 distinct boughs + central dome)
    crown_prims = []
    foliage_clouds = [
        (0.0, 28.0, 0.0, 8.5),     # Main apex crown
        (-6.0, 24.5, -3.5, 6.2),  # West bough
        (5.5, 25.0, -4.0, 6.5),   # East bough
        (-3.0, 26.0, 5.0, 6.0),   # South bough
        (4.5, 26.5, 4.5, 5.8),    # SE bough
        (0.0, 22.0, -1.0, 5.5),   # Lower mid canopy
    ]
    for x, y, z, r in foliage_clouds:
        crown_prims.append(generate_sphere(r, u_segments=10, v_segments=8, center=(x, y, z)))

    c_pos, c_norm, c_idx = merge_primitives(crown_prims)

    materials = [
        {
            "name": "Bark_Hardwood",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.42, 0.32, 0.22, 1.0], # Warm natural cedar/oak bark
                "roughnessFactor": 0.88,
                "metallicFactor": 0.02
            }
        },
        {
            "name": "Foliage_Broadleaf",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.26, 0.52, 0.24, 1.0], # Bright vibrant healthy forest green
                "roughnessFactor": 0.68,
                "metallicFactor": 0.01
            }
        }
    ]

    meshes = [
        {"positions": t_pos, "normals": t_norm, "indices": t_idx, "material_index": 0},
        {"positions": c_pos, "normals": c_norm, "indices": c_idx, "material_index": 1}
    ]

    nodes = [
        {"name": "Trunk_Node", "mesh": 0},
        {"name": "Canopy_Node", "mesh": 1}
    ]

    return build_glb(meshes, materials, nodes)

def create_conifer_tree():
    """Tapering pine/fir conifer with whorled descending branch tiers (Height: 24m)"""
    trunk_prims = [
        generate_cylinder(1.4, 0.3, 24.0, segments=10, y_offset=0.0)
    ]
    t_pos, t_norm, t_idx = merge_primitives(trunk_prims)

    # Conical needle tiers
    needle_prims = []
    tiers = [
        (22.0, 2.5),
        (18.5, 4.2),
        (15.0, 5.6),
        (11.5, 6.8),
        (8.0, 7.8),
        (5.0, 8.5)
    ]
    for y, r in tiers:
        needle_prims.append(generate_sphere(r, u_segments=10, v_segments=6, center=(0, y, 0)))

    n_pos, n_norm, n_idx = merge_primitives(needle_prims)

    materials = [
        {"name": "Bark_Pine", "pbrMetallicRoughness": {"baseColorFactor": [0.38, 0.28, 0.18, 1.0], "roughnessFactor": 0.88, "metallicFactor": 0.02}},
        {"name": "Needles_Pine", "pbrMetallicRoughness": {"baseColorFactor": [0.20, 0.44, 0.26, 1.0], "roughnessFactor": 0.72, "metallicFactor": 0.02}}
    ]
    meshes = [
        {"positions": t_pos, "normals": t_norm, "indices": t_idx, "material_index": 0},
        {"positions": n_pos, "normals": n_norm, "indices": n_idx, "material_index": 1}
    ]
    nodes = [{"name": "PineTrunk", "mesh": 0}, {"name": "PineNeedles", "mesh": 1}]
    return build_glb(meshes, materials, nodes)

def create_palm_tree():
    """Tropical palm tree with slender curved ringed trunk and arching pinnate fronds (Height: 16m)"""
    t1 = generate_cylinder(0.65, 0.52, 5.5, segments=8, y_offset=0.0)
    t2 = generate_cylinder(0.52, 0.42, 5.5, segments=8, y_offset=5.5)
    t3 = generate_cylinder(0.42, 0.35, 5.0, segments=8, y_offset=11.0)
    t_pos, t_norm, t_idx = merge_primitives([t1, t2, t3])

    frond_prims = []
    for i in range(8):
        angle = (i / 8.0) * math.pi * 2
        fx = math.cos(angle) * 3.4
        fz = math.sin(angle) * 3.4
        fy = 15.2 - (math.sin(i * 1.5) * 0.4)
        frond_prims.append(generate_sphere(2.6, u_segments=6, v_segments=4, center=(fx, fy, fz)))
    frond_prims.append(generate_sphere(2.2, u_segments=6, v_segments=4, center=(0, 16.5, 0)))

    f_pos, f_norm, f_idx = merge_primitives(frond_prims)

    materials = [
        {"name": "Palm_Trunk", "pbrMetallicRoughness": {"baseColorFactor": [0.46, 0.38, 0.28, 1.0], "roughnessFactor": 0.85, "metallicFactor": 0.02}},
        {"name": "Palm_Fronds", "pbrMetallicRoughness": {"baseColorFactor": [0.28, 0.56, 0.22, 1.0], "roughnessFactor": 0.65, "metallicFactor": 0.01}}
    ]
    meshes = [
        {"positions": t_pos, "normals": t_norm, "indices": t_idx, "material_index": 0},
        {"positions": f_pos, "normals": f_norm, "indices": f_idx, "material_index": 1}
    ]
    nodes = [{"name": "Trunk", "mesh": 0}, {"name": "Fronds", "mesh": 1}]
    return build_glb(meshes, materials, nodes)

def create_understory_shrub():
    """Woody multi-stem understory bush with dense foliage (Height: 3.5m)"""
    stems = [
        generate_cylinder(0.12, 0.06, 2.2, segments=6, y_offset=0.0),
        generate_cylinder(0.10, 0.05, 2.0, segments=6, y_offset=0.0),
        generate_cylinder(0.10, 0.05, 2.0, segments=6, y_offset=0.0)
    ]
    s_pos, s_norm, s_idx = merge_primitives(stems)

    leaves = [
        generate_sphere(1.4, u_segments=8, v_segments=6, center=(0.0, 2.2, 0.0)),
        generate_sphere(1.1, u_segments=8, v_segments=6, center=(-0.8, 1.8, 0.5)),
        generate_sphere(1.2, u_segments=8, v_segments=6, center=(0.7, 1.7, -0.6)),
    ]
    l_pos, l_norm, l_idx = merge_primitives(leaves)

    materials = [
        {"name": "Shrub_Stems", "pbrMetallicRoughness": {"baseColorFactor": [0.38, 0.28, 0.18, 1.0], "roughnessFactor": 0.88, "metallicFactor": 0.02}},
        {"name": "Shrub_Leaves", "pbrMetallicRoughness": {"baseColorFactor": [0.28, 0.55, 0.24, 1.0], "roughnessFactor": 0.68, "metallicFactor": 0.01}}
    ]
    meshes = [
        {"positions": s_pos, "normals": s_norm, "indices": s_idx, "material_index": 0},
        {"positions": l_pos, "normals": l_norm, "indices": l_idx, "material_index": 1}
    ]
    nodes = [{"name": "Stems", "mesh": 0}, {"name": "Leaves", "mesh": 1}]
    return build_glb(meshes, materials, nodes)

def create_granite_boulder():
    """Irregular faceted granitic outcrop boulder (Length: 4.5m, Height: 2.4m)"""
    boulders = [
        generate_sphere(2.2, u_segments=8, v_segments=6, center=(0, 1.6, 0)),
        generate_sphere(1.6, u_segments=8, v_segments=6, center=(1.8, 1.2, 0.5)),
        generate_sphere(1.4, u_segments=8, v_segments=6, center=(-1.6, 1.0, -0.4))
    ]
    pos, norm, idx = merge_primitives(boulders)
    materials = [{
        "name": "Granite_Rock",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.58, 0.56, 0.53, 1.0], # Bright weathered warm gray stone
            "roughnessFactor": 0.90,
            "metallicFactor": 0.02
        }
    }]
    meshes = [{"positions": pos, "normals": norm, "indices": idx, "material_index": 0}]
    nodes = [{"name": "Boulder", "mesh": 0}]
    return build_glb(meshes, materials, nodes)

def create_ranger_cabin():
    """Forest ranger station / cabin with timber walls, terracotta roof, and stone chimney (8m x 6m x 5.5m)"""
    body = generate_box(8.0, 3.6, 6.0, center=(0, 1.8, 0))
    roof_l = generate_box(8.6, 0.35, 3.8, center=(0, 4.4, -1.6))
    roof_r = generate_box(8.6, 0.35, 3.8, center=(0, 4.4, 1.6))
    chimney = generate_box(1.2, 6.0, 1.2, center=(-3.4, 3.0, 0))
    porch_floor = generate_box(8.0, 0.3, 2.2, center=(0, 0.15, 4.1))
    post1 = generate_cylinder(0.12, 0.12, 2.8, segments=6, y_offset=0.3)
    post1_pos = [(p[0]-3.5, p[1], p[2]+5.0) for p in post1[0]]
    post2_pos = [(p[0]+3.5, p[1], p[2]+5.0) for p in post1[0]]

    w_pos, w_norm, w_idx = merge_primitives([body, (post1_pos, post1[1], post1[2]), (post2_pos, post1[1], post1[2])])
    r_pos, r_norm, r_idx = merge_primitives([roof_l, roof_r, porch_floor])
    c_pos, c_norm, c_idx = merge_primitives([chimney])

    materials = [
        {"name": "Timber_Logs", "pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.38, 0.24, 1.0], "roughnessFactor": 0.85, "metallicFactor": 0.02}},
        {"name": "Terracotta_Roof", "pbrMetallicRoughness": {"baseColorFactor": [0.62, 0.32, 0.22, 1.0], "roughnessFactor": 0.72, "metallicFactor": 0.04}},
        {"name": "Stone_Masonry", "pbrMetallicRoughness": {"baseColorFactor": [0.52, 0.50, 0.48, 1.0], "roughnessFactor": 0.92, "metallicFactor": 0.02}}
    ]

    meshes = [
        {"positions": w_pos, "normals": w_norm, "indices": w_idx, "material_index": 0},
        {"positions": r_pos, "normals": r_norm, "indices": r_idx, "material_index": 1},
        {"positions": c_pos, "normals": c_norm, "indices": c_idx, "material_index": 2}
    ]

    nodes = [
        {"name": "Walls", "mesh": 0},
        {"name": "Roof", "mesh": 1},
        {"name": "Chimney", "mesh": 2}
    ]

    return build_glb(meshes, materials, nodes)

def create_rural_house():
    """Rural settlement house / dwelling (6.5m x 5m x 4.8m)"""
    body = generate_box(6.5, 3.2, 5.0, center=(0, 1.6, 0))
    roof = generate_box(7.2, 0.35, 5.8, center=(0, 3.6, 0))
    door = generate_box(1.2, 2.2, 0.2, center=(0, 1.1, 2.55))

    b_pos, b_norm, b_idx = merge_primitives([body])
    r_pos, r_norm, r_idx = merge_primitives([roof, door])

    materials = [
        {"name": "House_Walls", "pbrMetallicRoughness": {"baseColorFactor": [0.65, 0.58, 0.48, 1.0], "roughnessFactor": 0.88, "metallicFactor": 0.02}},
        {"name": "House_Roof", "pbrMetallicRoughness": {"baseColorFactor": [0.45, 0.28, 0.20, 1.0], "roughnessFactor": 0.75, "metallicFactor": 0.04}}
    ]
    meshes = [
        {"positions": b_pos, "normals": b_norm, "indices": b_idx, "material_index": 0},
        {"positions": r_pos, "normals": r_norm, "indices": r_idx, "material_index": 1}
    ]
    nodes = [{"name": "Walls", "mesh": 0}, {"name": "Roof", "mesh": 1}]
    return build_glb(meshes, materials, nodes)

def create_fire_watchtower():
    """Forest fire observation watchtower (Height: 18m) with 4 timber legs and elevated observation cab"""
    leg_prims = []
    for lx in (-3.0, 3.0):
        for lz in (-3.0, 3.0):
            leg_prims.append(generate_cylinder(0.24, 0.18, 15.0, segments=6, y_offset=0.0))
            last = leg_prims[-1]
            shifted = [(p[0]+lx, p[1], p[2]+lz) for p in last[0]]
            leg_prims[-1] = (shifted, last[1], last[2])

    frame_pos, frame_norm, frame_idx = merge_primitives(leg_prims)

    cab_body = generate_box(3.6, 2.6, 3.6, center=(0, 16.3, 0))
    cab_roof = generate_box(4.2, 0.3, 4.2, center=(0, 17.8, 0))
    platform = generate_box(4.8, 0.25, 4.8, center=(0, 15.0, 0))

    cab_pos, cab_norm, cab_idx = merge_primitives([cab_body, cab_roof, platform])

    materials = [
        {"name": "Tower_Frame", "pbrMetallicRoughness": {"baseColorFactor": [0.48, 0.35, 0.22, 1.0], "roughnessFactor": 0.88, "metallicFactor": 0.04}},
        {"name": "Tower_Cabin", "pbrMetallicRoughness": {"baseColorFactor": [0.70, 0.68, 0.64, 1.0], "roughnessFactor": 0.78, "metallicFactor": 0.04}}
    ]

    meshes = [
        {"positions": frame_pos, "normals": frame_norm, "indices": frame_idx, "material_index": 0},
        {"positions": cab_pos, "normals": cab_norm, "indices": cab_idx, "material_index": 1}
    ]

    nodes = [
        {"name": "Frame", "mesh": 0},
        {"name": "Cabin", "mesh": 1}
    ]

    return build_glb(meshes, materials, nodes)

def create_timber_bridge():
    """Wooden post-and-beam bridge spanning across river (Span: 18m, Width: 4.5m)"""
    deck = generate_box(18.0, 0.4, 4.5, center=(0, 1.8, 0))
    rail_l = generate_box(18.0, 0.9, 0.15, center=(0, 2.45, -2.1))
    rail_r = generate_box(18.0, 0.9, 0.15, center=(0, 2.45, 2.1))
    pile1 = generate_cylinder(0.25, 0.25, 3.6, segments=6, y_offset=-0.2)
    p1 = [(p[0]-6.0, p[1], p[2]-1.8) for p in pile1[0]]
    p2 = [(p[0]-6.0, p[1], p[2]+1.8) for p in pile1[0]]
    p3 = [(p[0]+6.0, p[1], p[2]-1.8) for p in pile1[0]]
    p4 = [(p[0]+6.0, p[1], p[2]+1.8) for p in pile1[0]]

    pos, norm, idx = merge_primitives([deck, rail_l, rail_r, (p1, pile1[1], pile1[2]), (p2, pile1[1], pile1[2]), (p3, pile1[1], pile1[2]), (p4, pile1[1], pile1[2])])

    materials = [{
        "name": "Bridge_Timber",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.50, 0.36, 0.22, 1.0], # Weathered cedar timber bridge
            "roughnessFactor": 0.88,
            "metallicFactor": 0.02
        }
    }]
    meshes = [{"positions": pos, "normals": norm, "indices": idx, "material_index": 0}]
    nodes = [{"name": "Bridge", "mesh": 0}]
    return build_glb(meshes, materials, nodes)

def main():
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'models'))
    os.makedirs(target_dir, exist_ok=True)

    assets = {
        'tree_hardwood.glb': create_hardwood_tree,
        'tree_conifer.glb': create_conifer_tree,
        'tree_palm.glb': create_palm_tree,
        'shrub_bush.glb': create_understory_shrub,
        'rock_boulder.glb': create_granite_boulder,
        'cabin_station.glb': create_ranger_cabin,
        'house_rural.glb': create_rural_house,
        'fire_tower.glb': create_fire_watchtower,
        'bridge_timber.glb': create_timber_bridge,
    }

    for name, gen_fn in assets.items():
        out_path = os.path.join(target_dir, name)
        glb_data = gen_fn()
        with open(out_path, 'wb') as f:
            f.write(glb_data)
        print(f"Generated {name} ({len(glb_data):,} bytes) -> {out_path}")

    print("\nAll 3D assets generated successfully in public/models/!")

if __name__ == '__main__':
    main()
