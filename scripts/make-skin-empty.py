"""
scripts/make-skin-empty.py

Generates normalized skin assets and matching -empty.png silhouettes for Bulko.

Requirements:
- Normalize all skin PNGs:
  * Transparent background (no green fringe)
  * Trim to character's bounding box
  * Scale to fit the same height (930px)
  * Center horizontally
  * Align feet to bottom (y = 1004 on 1024x1024 canvas)
  * Pad to shared 1024x1024 canvas size
  * Save to assets/skins/<id>.png
- Generate matching -empty.png files:
  * Exact same alpha channel as <id>.png
  * Fill opaque pixels with #E8DECB (232, 222, 203)
  * Keep pixels darker than luminance threshold (the dark navy outline) from the original
  * Save to assets/skins/<id>-empty.png
- Skins: classic, gym, chef, explorer, hoodie, dhoti, astronaut.
"""

import os
import cv2
import numpy as np
from PIL import Image

CANVAS_SIZE = 1024
TARGET_HEIGHT = 930
BOTTOM_Y = 1004  # 20px padding from canvas bottom

# Target beige empty color #E8DECB
BEIGE_RGB = np.array([232.0, 222.0, 203.0], dtype=np.float32)

# Luminance threshold range for dark navy outline
LUM_LOW = 34.0
LUM_HIGH = 58.0


def extract_clean_rgba(src_path: str, is_green_screen: bool = True) -> Image.Image:
    """Load image, remove green-screen if needed, and despill navy edges."""
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Source file not found: {src_path}")

    im_bgr = cv2.imread(src_path)
    h, w = im_bgr.shape[:2]
    rgb = cv2.cvtColor(im_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)

    if not is_green_screen:
        # Already transparent RGBA PNG or white background
        pil_im = Image.open(src_path).convert('RGBA')
        arr = np.array(pil_im)
        if np.any(arr[:, :, 3] < 250):
            return pil_im
        # White background removal
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        is_bg = (r > 245) & (g > 245) & (b > 245)
        alpha = np.where(is_bg, 0, 255).astype(np.uint8)
        arr[:, :, 3] = alpha
        return Image.fromarray(arr, mode='RGBA')

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    max_rb = np.maximum(r, b)
    dg = g - max_rb

    # Chroma key mask for neon green screen (G > 180, R < 80, B < 80, dg > 100)
    is_bg = (g > 175) & (r < 80) & (b < 80) & (dg > 95)

    # Dilate background mask by 5px to find transition zone
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dilated_bg = cv2.dilate(is_bg.astype(np.uint8), kernel)
    boundary = (dilated_bg == 1) & (~is_bg)

    alpha = np.ones((h, w), dtype=np.float32)
    alpha[is_bg] = 0.0

    # Smoothstep falloff on transition boundary
    t = np.clip((dg[boundary] - 5.0) / 60.0, 0.0, 1.0)
    alpha[boundary] = 1.0 - (t * t * (3.0 - 2.0 * t))

    # Edge despill to protect navy outline and character body
    navy_limit = np.maximum(rgb[:, :, 0], 0.35 * rgb[:, :, 0] + 0.65 * rgb[:, :, 2])
    edge_spill = (dg > 5) & (~is_bg)
    rgb[edge_spill, 1] = np.minimum(rgb[edge_spill, 1], navy_limit[edge_spill])

    full_rgba = np.dstack([rgb, alpha * 255.0])
    return Image.fromarray(np.clip(full_rgba, 0, 255).astype(np.uint8), mode='RGBA')


def normalize_skin(im_rgba: Image.Image) -> Image.Image:
    """Trim to bounding box, scale to uniform height, center horizontally, and align feet."""
    arr = np.array(im_rgba)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 8)

    if len(ys) == 0 or len(xs) == 0:
        raise ValueError("Image appears to be empty/fully transparent")

    ymin, ymax = ys.min(), ys.max()
    xmin, xmax = xs.min(), xs.max()

    cropped = im_rgba.crop((xmin, ymin, xmax + 1, ymax + 1))
    crop_w, crop_h = cropped.size

    scale = TARGET_HEIGHT / float(crop_h)
    new_w = int(round(crop_w * scale))
    new_h = TARGET_HEIGHT

    # Resize with high quality Lanczos filter
    scaled = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Place onto 1024x1024 canvas
    canvas = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x_pos = (CANVAS_SIZE - new_w) // 2
    y_pos = BOTTOM_Y - new_h

    canvas.paste(scaled, (x_pos, y_pos), scaled)
    return canvas


def generate_empty_silhouette(norm_im: Image.Image) -> Image.Image:
    """Generate beige silhouette keeping the original navy outline and exact alpha."""
    arr = np.array(norm_im).astype(np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    # Luminance formula: 0.299*R + 0.587*G + 0.114*B
    lum = 0.299 * r + 0.587 * g + 0.114 * b

    # Transition factor t: 0.0 = dark navy outline, 1.0 = #E8DECB body fill
    t = np.clip((lum - LUM_LOW) / (LUM_HIGH - LUM_LOW), 0.0, 1.0)
    # Smoothstep curve for seamless anti-aliased edge
    t = t * t * (3.0 - 2.0 * t)

    out_rgb = np.zeros_like(arr[:, :, :3])
    for c in range(3):
        out_rgb[:, :, c] = arr[:, :, c] * (1.0 - t) + BEIGE_RGB[c] * t

    # Preserve the exact same alpha channel
    out_rgba = np.dstack([out_rgb, a])
    return Image.fromarray(np.clip(out_rgba, 0, 255).astype(np.uint8), mode='RGBA')


def generate_fill_simulation(color_im: Image.Image, empty_im: Image.Image, percent: int) -> Image.Image:
    """Simulate fill percentage to visually verify alignment with zero offset."""
    canvas = empty_im.copy()
    w, h = canvas.size

    if percent <= 0:
        return canvas

    fill_h = int(round(h * (percent / 100.0)))
    top_y = h - fill_h

    # Crop lower portion of color image
    color_bottom = color_im.crop((0, top_y, w, h))
    canvas.paste(color_bottom, (0, top_y), color_bottom)
    return canvas


def main():
    root_dir = r'C:\Bulko'
    user_uploads = r'C:\Users\Pavan Kumar\.gemini\antigravity-ide\brain\d6c6353b-c96a-4aac-9c99-6cdacfc825ca\.user_uploaded'
    out_skins_dir = os.path.join(root_dir, 'assets', 'skins')
    os.makedirs(out_skins_dir, exist_ok=True)

    # Configuration for all 7 skins
    # Format: (skin_id, source_path, is_green_screen, aliases)
    skins_meta = [
        ('classic', os.path.join(root_dir, 'assets', 'mascot', 'tank.png'), False, []),
        ('gym', os.path.join(user_uploads, 'media_1792729352718.png'), True, []),
        ('chef', os.path.join(user_uploads, 'media_1792729360550.png'), True, []),
        ('explorer', os.path.join(user_uploads, 'media_1792729368711.png'), True, []),
        ('hoodie', os.path.join(user_uploads, 'media_1792729380359.png'), True, []),
        ('dhoti', os.path.join(user_uploads, 'media_1792729387846.png'), True, ['namaste']),
        ('astronaut', os.path.join(user_uploads, 'media_1792730737036.png'), True, []),
    ]

    print("=== 1. Normalizing Skins & Generating Silhouettes ===")
    test_simulations = []

    for skin_id, src_path, is_green, aliases in skins_meta:
        print(f"Processing '{skin_id}' from {os.path.basename(src_path)}...")
        raw_clean = extract_clean_rgba(src_path, is_green_screen=is_green)
        norm_color = normalize_skin(raw_clean)
        norm_empty = generate_empty_silhouette(norm_color)

        # Save main files: assets/skins/<id>.png and assets/skins/<id>-empty.png
        color_path = os.path.join(out_skins_dir, f"{skin_id}.png")
        empty_path = os.path.join(out_skins_dir, f"{skin_id}-empty.png")
        norm_color.save(color_path, format='PNG')
        norm_empty.save(empty_path, format='PNG')
        print(f"  -> Saved {color_path} (1024x1024)")
        print(f"  -> Saved {empty_path} (1024x1024)")

        # Save aliases if specified (e.g. namaste -> dhoti)
        for alias in aliases:
            alias_color_path = os.path.join(out_skins_dir, f"{alias}.png")
            alias_empty_path = os.path.join(out_skins_dir, f"{alias}-empty.png")
            norm_color.save(alias_color_path, format='PNG')
            norm_empty.save(alias_empty_path, format='PNG')
            print(f"  -> Saved alias {alias_color_path} & {alias_empty_path}")

        # Generate fill simulations for 0%, 35%, 60%, 100%
        for pct in [0, 35, 60, 100]:
            sim = generate_fill_simulation(norm_color, norm_empty, pct)
            test_simulations.append((skin_id, pct, sim))

    print("\n=== 2. Generating Alignment Verification Sheet ===")
    # 7 skins rows x 4 fill columns (0%, 35%, 60%, 100%)
    preview_thumb_size = 256
    num_cols = 4
    num_rows = len(skins_meta)
    sheet_w = num_cols * preview_thumb_size
    sheet_h = num_rows * preview_thumb_size
    # Dark card background #0E1626
    sheet = Image.new('RGB', (sheet_w, sheet_h), (14, 22, 38))

    for idx, (skin_id, pct, sim) in enumerate(test_simulations):
        row = idx // num_cols
        col = idx % num_cols
        thumb = sim.resize((preview_thumb_size, preview_thumb_size), Image.Resampling.LANCZOS)
        # Paste on dark background
        sheet.paste(thumb, (col * preview_thumb_size, row * preview_thumb_size), thumb)

    preview_path = os.path.join(out_skins_dir, 'skins-fill-alignment-preview.png')
    sheet.save(preview_path, format='PNG')
    print(f"Generated alignment preview sheet: {preview_path}")

    # Also copy to artifacts dir for user visibility
    brain_dir = r'C:\Users\Pavan Kumar\.gemini\antigravity-ide\brain\d6c6353b-c96a-4aac-9c99-6cdacfc825ca'
    artifact_preview = os.path.join(brain_dir, 'skins-fill-alignment-preview.png')
    sheet.save(artifact_preview, format='PNG')
    print(f"Saved artifact preview: {artifact_preview}")
    print("\n[make-skin-empty.py] All operations completed successfully!")


if __name__ == '__main__':
    main()
