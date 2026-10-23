import cv2  # type: ignore
import numpy as np  # type: ignore
from PIL import Image  # type: ignore
import os

def prepare_mascot():
    source_path = 'assets/mascot/tank-source.png'
    output_dir = 'assets/mascot'
    os.makedirs(output_dir, exist_ok=True)

    print(f"Loading {source_path}...")
    src_bgr = cv2.imread(source_path)
    if src_bgr is None:
        raise FileNotFoundError(f"Cannot load {source_path}")

    h_orig, w_orig = src_bgr.shape[:2]
    print(f"Original dimensions: {w_orig}x{h_orig}")

    src_rgb = cv2.cvtColor(src_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
    r = src_rgb[:, :, 0]
    g = src_rgb[:, :, 1]
    b = src_rgb[:, :, 2]

    # --- 1. CHROMA KEY & DESPILL ---
    # Background color analysis:
    # Pure green screen is approximately [2, 249, 8].
    # Green difference metric: dg = G - max(R, B)
    max_rb = np.maximum(r, b)
    dg = g - max_rb

    # Alpha matte generation:
    # In the background: dg is ~240.
    # In the character: dg is <= 0 everywhere.
    # In the transition: 0 < dg < 100.
    # We use a smoothstep falloff between dg = 2.0 and dg = 60.0:
    t = np.clip((dg - 2.0) / 58.0, 0.0, 1.0)
    # Smoothstep: 3*t^2 - 2*t^3
    alpha_raw = 1.0 - (t * t * (3.0 - 2.0 * t))

    # Unmix foreground color on semi-transparent transition pixels
    bg_green = np.array([2.0, 249.0, 8.0], dtype=np.float32)
    fg = src_rgb.copy()
    mask_semi = (alpha_raw > 0.001) & (alpha_raw < 0.999)
    for c in range(3):
        # Subtract background green contribution
        fg[mask_semi, c] = (src_rgb[mask_semi, c] - (1.0 - alpha_raw[mask_semi]) * bg_green[c]) / np.maximum(alpha_raw[mask_semi], 0.01)
    fg = np.clip(fg, 0.0, 255.0)

    # Despill:
    # Any residual green along the dark-navy outline boundary where G > max(R, B)
    # In the dark navy outline: R ~ 8, B ~ 34, G ~ 19.
    # Limit G to not exceed 0.3 * R + 0.65 * B or max(R, B)
    navy_g_limit = np.maximum(fg[:, :, 0], 0.35 * fg[:, :, 0] + 0.65 * fg[:, :, 2])
    # Apply despill to edge pixels where dg was positive
    edge_mask = dg > 0
    fg[edge_mask, 1] = np.minimum(fg[edge_mask, 1], navy_g_limit[edge_mask])

    # Ensure background pixels (alpha = 0) are completely cleared
    full_rgba = np.dstack([fg, alpha_raw * 255.0])

    # --- 2. TRIM TO CONTENT ---
    # Find bounding box where alpha > 2 (ignore trace noise)
    alpha_mask = full_rgba[:, :, 3] > 2
    rows = np.any(alpha_mask, axis=1)
    cols = np.any(alpha_mask, axis=0)
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]

    # Crop to bounding box
    cropped_rgba = full_rgba[rmin:rmax+1, cmin:cmax+1]
    crop_h, crop_w = cropped_rgba.shape[:2]
    print(f"Trimmed content bounds: left={cmin}, top={rmin}, right={cmax}, bottom={rmax}")
    print(f"Trimmed size: {crop_w}x{crop_h} (aspect: {crop_w/crop_h:.4f})")

    # --- 3. SCALE TO 1024px TALL ---
    target_h = 1024
    scale = target_h / crop_h
    target_w = int(round(crop_w * scale))
    print(f"Resizing to: {target_w}x{target_h} (exact 1024px tall)")

    # Use Pillow with Lanczos for highest quality resizing
    pil_cropped = Image.fromarray(np.clip(cropped_rgba, 0, 255).astype(np.uint8), mode='RGBA')
    pil_tank = pil_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    tank_rgba = np.array(pil_tank)

    tank_path = os.path.join(output_dir, 'tank.png')
    pil_tank.save(tank_path, format='PNG')
    print(f"Saved: {tank_path} ({target_w}x{target_h})")

    # --- 4. CREATE TANK-SILHOUETTE.PNG ---
    # Solid white shape of the whole body including everything inside the outer outline,
    # transparent elsewhere.
    # To flood-fill from the outside:
    # 1. Take alpha channel of tank_rgba.
    tank_alpha = tank_rgba[:, :, 3]

    # Create padded binary mask for flood fill: 0 = transparent/empty, 255 = character
    # Use threshold to find solid character regions
    pad = 2
    padded_w = target_w + 2 * pad
    padded_h = target_h + 2 * pad
    padded_grid = np.zeros((padded_h, padded_w), dtype=np.uint8)
    # Foreground pixels where alpha > 30 are considered inside the outer barrier
    padded_grid[pad:pad+target_h, pad:pad+target_w] = np.where(tank_alpha > 30, 255, 0).astype(np.uint8)

    # Flood fill from outside border (0, 0) in cv2
    flood_mask = np.zeros((padded_h + 2, padded_w + 2), dtype=np.uint8)
    flood_img = padded_grid.copy()
    cv2.floodFill(flood_img, flood_mask, (0, 0), 128)

    # Outside is filled with 128. Inside (the mascot) is NOT 128.
    inside_padded = (flood_img != 128)
    inside_mask = inside_padded[pad:pad+target_h, pad:pad+target_w]

    # Build silhouette:
    # Inside is pure white [255, 255, 255].
    # Alpha matches the anti-aliased edge of tank_rgba for subpixel precision!
    silhouette_rgba = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    silhouette_rgba[:, :, 0] = 255
    silhouette_rgba[:, :, 1] = 255
    silhouette_rgba[:, :, 2] = 255
    # Smooth outer edge matches tank_rgba's alpha, internal pixels are 255
    silhouette_rgba[:, :, 3] = np.where(inside_mask, np.maximum(tank_alpha, 255 * inside_mask), 0).astype(np.uint8)

    # Smooth any single-pixel fringe to ensure solid interior
    # Internal pixels (distance > 3px from edge) are fully 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    eroded_inside = cv2.erode(inside_mask.astype(np.uint8), kernel, iterations=2)
    silhouette_rgba[eroded_inside == 1, 3] = 255
    # Outer edge follows tank_alpha
    edge_zone = (inside_mask == 1) & (eroded_inside == 0)
    silhouette_rgba[edge_zone, 3] = tank_alpha[edge_zone]

    pil_silhouette = Image.fromarray(silhouette_rgba, mode='RGBA')
    silhouette_path = os.path.join(output_dir, 'tank-silhouette.png')
    pil_silhouette.save(silhouette_path, format='PNG')
    print(f"Saved: {silhouette_path} ({target_w}x{target_h})")

    # --- 5. CREATE TANK-OUTLINE.PNG ---
    # Only the dark-navy outline, with everything else transparent.
    tank_rgb = tank_rgba[:, :, :3].astype(np.float32)
    tank_a = tank_rgba[:, :, 3].astype(np.float32) / 255.0

    # The dark-navy outline has very low brightness:
    # Dark navy outline mean RGB is ~[8, 17, 35], max_c is ~35-50.
    # Colored regions have max_c >= 85 (brown hair >= 85, orange >= 200, gold >= 220, cream >= 230).
    max_channel = np.max(tank_rgb, axis=2)

    # Outline alpha factor:
    # For max_channel <= 45: 100% outline
    # For 45 < max_channel < 75: smooth transition to 0%
    # For max_channel >= 75: 0% outline (fully transparent colored fill)
    outline_t = np.clip((max_channel - 45.0) / 30.0, 0.0, 1.0)
    # Inverted smoothstep
    outline_factor = 1.0 - (outline_t * outline_t * (3.0 - 2.0 * outline_t))
    outline_alpha = np.clip(tank_a * outline_factor * 255.0, 0.0, 255.0).astype(np.uint8)

    # The dark navy outline color:
    # We use the actual dark navy color from the artist line art: [8, 18, 35]
    # For anti-aliased edge blending, preserving the dark navy tone ensures no color fringing
    outline_rgba = np.zeros((target_h, target_w, 4), dtype=np.uint8)
    outline_rgba[:, :, 0] = np.clip(tank_rgba[:, :, 0], 6, 20)
    outline_rgba[:, :, 1] = np.clip(tank_rgba[:, :, 1], 14, 26)
    outline_rgba[:, :, 2] = np.clip(tank_rgba[:, :, 2], 28, 44)
    outline_rgba[:, :, 3] = outline_alpha

    pil_outline = Image.fromarray(outline_rgba, mode='RGBA')
    outline_path = os.path.join(output_dir, 'tank-outline.png')
    pil_outline.save(outline_path, format='PNG')
    print(f"Saved: {outline_path} ({target_w}x{target_h})")

    # --- 6. CREATE VERIFICATION COMPOSITE (SIDE BY SIDE ON DARK BACKGROUND) ---
    # Show the three outputs side by side on a dark background (#17233D - Protie's dark navy)
    # Scale each image down to e.g. 512px height for a clean side-by-side display
    preview_h = 512
    preview_w = int(round(target_w * (preview_h / target_h)))
    gap = 40
    padding = 50

    comp_w = padding * 2 + preview_w * 3 + gap * 2
    comp_h = padding * 2 + preview_h + 80 # extra space for labels

    # Dark background color: #17233D (RGB: 23, 35, 61)
    dark_bg_color = (23, 35, 61)
    comp_img = Image.new('RGB', (comp_w, comp_h), dark_bg_color)

    # Prepare resized versions for preview
    preview_tank = pil_tank.resize((preview_w, preview_h), Image.Resampling.LANCZOS)
    preview_sil = pil_silhouette.resize((preview_w, preview_h), Image.Resampling.LANCZOS)
    preview_out = pil_outline.resize((preview_w, preview_h), Image.Resampling.LANCZOS)

    # Paste onto dark background with alpha compositing
    x1 = padding
    x2 = padding + preview_w + gap
    x3 = padding + (preview_w + gap) * 2
    y_img = padding + 40

    comp_img.paste(preview_tank, (x1, y_img), preview_tank)
    comp_img.paste(preview_sil, (x2, y_img), preview_sil)
    comp_img.paste(preview_out, (x3, y_img), preview_out)

    # Add text labels via OpenCV or PIL drawing
    comp_np = np.array(comp_img)
    # Titles
    font = cv2.FONT_HERSHEY_DUPLEX
    cv2.putText(comp_np, "1. tank.png", (x1 + 20, padding + 25), font, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(comp_np, "(Chroma-keyed & despilled)", (x1 + 20, padding + preview_h + 65), font, 0.6, (180, 195, 215), 1, cv2.LINE_AA)

    cv2.putText(comp_np, "2. tank-silhouette.png", (x2 + 20, padding + 25), font, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(comp_np, "(Solid white progress mask)", (x2 + 20, padding + preview_h + 65), font, 0.6, (180, 195, 215), 1, cv2.LINE_AA)

    cv2.putText(comp_np, "3. tank-outline.png", (x3 + 20, padding + 25), font, 0.9, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(comp_np, "(Dark-navy overlay outline)", (x3 + 20, padding + preview_h + 65), font, 0.6, (180, 195, 215), 1, cv2.LINE_AA)

    # Top overall title
    cv2.putText(comp_np, "PROTIE MASCOT ASSET PREPARATION (VERIFICATION ON #17233D DARK BACKGROUND)",
                (padding, padding - 15), font, 0.75, (242, 187, 75), 2, cv2.LINE_AA)

    comp_result = Image.fromarray(comp_np)
    preview_path = os.path.join(output_dir, 'tank-verification-preview.png')
    comp_result.save(preview_path, format='PNG')

    # Also save to the artifact directory so it's viewable directly
    artifact_preview = 'C:/Users/Pavan Kumar/.gemini/antigravity-ide/brain/930746e3-179e-4fb2-a6e7-6b5e233e708b/tank-verification-preview.png'
    comp_result.save(artifact_preview, format='PNG')
    print(f"Saved verification preview: {preview_path} and {artifact_preview}")

if __name__ == '__main__':
    prepare_mascot()
