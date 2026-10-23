"""
Process Tank mascot skins from raw green-screen uploads into transparent 1024px PNGs.
Features:
- Chroma key background removal with smoothstep alpha falloff
- Anti-aliasing edge matting and dark-navy edge despill
- Trims excess transparent padding consistently
- Scales to consistent 1024px output height (LANCZOS)
- Generates a dark background verification preview sheet
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageDraw

def process_skins():
    brain_user_uploads = r'C:\Users\Pavan Kumar\.gemini\antigravity-ide\brain\d6c6353b-c96a-4aac-9c99-6cdacfc825ca\.user_uploaded'
    out_dir = r'C:\Bulko\assets\mascot\skins'
    os.makedirs(out_dir, exist_ok=True)

    skins_config = [
        ('tank-gym.png', 'media_1792729352718.png', 'Gym Tank'),
        ('tank-chef.png', 'media_1792729360550.png', 'Chef Tank'),
        ('tank-explorer.png', 'media_1792729368711.png', 'Explorer Tank'),
        ('tank-hoodie.png', 'media_1792729380359.png', 'Hoodie Tank'),
        ('tank-namaste.png', 'media_1792729387846.png', 'Namaste Tank'),
        ('tank-astronaut.png', 'media_1792730737036.png', 'Astronaut Tank'),
    ]

    processed = []

    for out_name, upload_fname, display_name in skins_config:
        src_path = os.path.join(brain_user_uploads, upload_fname)
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"Missing source upload: {src_path}")

        im_bgr = cv2.imread(src_path)
        h, w = im_bgr.shape[:2]
        rgb = cv2.cvtColor(im_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        max_rb = np.maximum(r, b)
        dg = g - max_rb

        # Pure green background
        is_bg = (g > 180) & (r < 75) & (b < 75) & (dg > 110)

        # Dilate is_bg by 5px to find transition boundary
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        dilated_bg = cv2.dilate(is_bg.astype(np.uint8), kernel)
        boundary = (dilated_bg == 1) & (~is_bg)

        # Alpha matte
        alpha = np.ones((h, w), dtype=np.float32)
        alpha[is_bg] = 0.0

        # Smoothstep on transition boundary
        t = np.clip((dg[boundary] - 0.0) / 70.0, 0.0, 1.0)
        alpha[boundary] = 1.0 - (t * t * (3.0 - 2.0 * t))

        # Despill edge pixels: preserve navy outlines
        fg = rgb.copy()
        despill_mask = (dilated_bg == 1) & (alpha > 0.0)
        fg[despill_mask, 1] = np.minimum(fg[despill_mask, 1], max_rb[despill_mask])

        rgba = np.dstack([fg, alpha * 255.0]).astype(np.uint8)
        pil_im = Image.fromarray(rgba, 'RGBA')

        # Trim excess padding
        bbox = pil_im.getbbox()
        trimmed = pil_im.crop(bbox)
        tw, th = trimmed.size

        # Scale to exact height of 1024px
        target_h = 1024
        scale = target_h / th
        out_w = int(round(tw * scale))
        scaled = trimmed.resize((out_w, target_h), Image.Resampling.LANCZOS)

        # Post-resample cleanup: eliminate Lanczos interpolation ringing & any edge green
        scaled_arr = np.array(scaled)
        s_r = scaled_arr[:, :, 0].copy()
        s_g = scaled_arr[:, :, 1].copy()
        s_b = scaled_arr[:, :, 2].copy()
        s_a = scaled_arr[:, :, 3].copy()
        # Cut off faint ringing
        s_a[s_a < 6] = 0
        # Despill any residual edge green where green exceeds max(r, b)
        edge_green = (s_a > 0) & (s_g > np.maximum(s_r, s_b)) & (s_g > 100)
        s_g[edge_green] = np.maximum(s_r[edge_green], s_b[edge_green])

        clean_scaled = Image.fromarray(np.dstack([s_r, s_g, s_b, s_a]), 'RGBA')
        out_path = os.path.join(out_dir, out_name)
        clean_scaled.save(out_path, format='PNG')
        print(f"Saved {out_name}: {out_w}x{target_h} RGBA")
        processed.append((out_name, display_name, clean_scaled))

    # Generate 2x3 Dark Verification Preview Sheet
    card_w = 420
    card_h = 500
    cols = 3
    rows = 2
    pad = 30
    header_h = 90
    sheet_w = cols * card_w + (cols + 1) * pad
    sheet_h = rows * card_h + (rows + 1) * pad + header_h

    preview = Image.new('RGB', (sheet_w, sheet_h), (13, 21, 39))  # #0D1527 dark background
    draw = ImageDraw.Draw(preview)

    draw.text((sheet_w // 2, 40), 'TANK PRO MASCOT SKINS — 6 NEW RELEASES', fill=(255, 255, 255), anchor='mm')
    draw.text((sheet_w // 2, 70), 'Verified 1024px Transparent RGBA PNGs (No Green Spill / Edge-Matted)', fill=(245, 158, 11), anchor='mm')

    for idx, (out_name, display_name, img) in enumerate(processed):
        r_idx = idx // cols
        c_idx = idx % cols
        x = pad + c_idx * (card_w + pad)
        y = header_h + pad + r_idx * (card_h + pad)

        draw.rounded_rectangle([x, y, x + card_w, y + card_h], radius=20, fill=(30, 41, 59), outline=(51, 65, 85), width=2)

        thumb_max_h = 360
        thumb_max_w = card_w - 40
        aspect = img.width / img.height
        thumb_h = thumb_max_h
        thumb_w = int(round(thumb_h * aspect))
        if thumb_w > thumb_max_w:
            thumb_w = thumb_max_w
            thumb_h = int(round(thumb_w / aspect))

        thumb = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        img_x = x + (card_w - thumb_w) // 2
        img_y = y + 25 + (thumb_max_h - thumb_h)
        preview.paste(thumb, (img_x, img_y), thumb)

        draw.text((x + card_w // 2, y + card_h - 60), display_name, fill=(255, 255, 255), anchor='mm')
        draw.text((x + card_w // 2, y + card_h - 35), f'{img.width}x{img.height} PNG  •  {out_name}', fill=(148, 163, 184), anchor='mm')

    preview_path = os.path.join(out_dir, 'skins-preview-dark.png')
    preview.save(preview_path, format='PNG')
    print(f"Saved dark preview: {preview_path}")

if __name__ == '__main__':
    process_skins()
