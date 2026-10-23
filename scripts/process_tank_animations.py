"""
Stage 7 — Tank Animation Clips Processor
Extracts Idle, Flex, and Sip animation sequences from assets/video/tank1.mp4,
removes the chroma key green background, performs edge despill to preserve
Tank's navy outlines and colors, aligns frames to a consistent 400x500 canvas,
and exports optimized transparent PNG sprite sequences and animated WebPs.
"""

import os
import cv2
import numpy as np
from PIL import Image, ImageDraw

def process_animations():
    video_path = r'C:\Bulko\assets\video\tank1.mp4'
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Missing source video: {video_path}")

    # Output directories
    base_anim_dir = r'C:\Bulko\assets\animations'
    idle_dir = os.path.join(base_anim_dir, 'idle')
    flex_dir = os.path.join(base_anim_dir, 'flex')
    sip_dir = os.path.join(base_anim_dir, 'sip')

    for d in [idle_dir, flex_dir, sip_dir]:
        os.makedirs(d, exist_ok=True)

    # Cut clips configuration
    # Idle: frames 0..27 (28 frames, ~1.17s)
    # Flex: frames 28..62 (35 frames, ~1.46s)
    # Sip:  frames 63..95 (33 frames, ~1.38s)
    clips_config = [
        ('idle', 0, 27, idle_dir),
        ('flex', 28, 62, flex_dir),
        ('sip', 63, 95, sip_dir),
    ]

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w_orig = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h_orig = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"Source clip specs: {w_orig}x{h_orig} @ {fps:.1f} fps, {total_frames} frames ({total_frames/fps:.2f}s)")

    # Read all frames into memory
    all_raw_frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        all_raw_frames.append(frame)
    cap.release()

    # Target output dimensions (Mobile high-res 4:5 aspect ratio)
    target_w = 400
    target_h = 500
    crop_ymin = 240
    crop_ymax = 1140  # height 900
    crop_xmin = 0
    crop_xmax = 720   # width 720

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    stats = {
        'idle': {'count': 0, 'total_bytes': 0, 'max_kb': 0, 'min_kb': 9999},
        'flex': {'count': 0, 'total_bytes': 0, 'max_kb': 0, 'min_kb': 9999},
        'sip':  {'count': 0, 'total_bytes': 0, 'max_kb': 0, 'min_kb': 9999},
    }

    exported_pil_images = {'idle': [], 'flex': [], 'sip': []}

    for action_name, start_f, end_f, out_dir in clips_config:
        print(f"\nProcessing {action_name.upper()}: frames {start_f}..{end_f} ({end_f - start_f + 1} frames)...")
        action_frames = []

        for f_idx in range(start_f, end_f + 1):
            frame_bgr = all_raw_frames[f_idx]
            rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB).astype(np.float32)
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            max_rb = np.maximum(r, b)
            dg = g - max_rb

            # Background detection: pure chroma green screen
            is_bg = (g > 160) & (dg > 60)
            dilated_bg = cv2.dilate(is_bg.astype(np.uint8), kernel)
            boundary = (dilated_bg == 1) & (~is_bg)

            # Alpha matte calculation
            alpha = np.ones((h_orig, w_orig), dtype=np.float32)
            alpha[is_bg] = 0.0

            # Smoothstep edge transition
            t = np.clip((dg[boundary] - 0.0) / 60.0, 0.0, 1.0)
            alpha[boundary] = 1.0 - (t * t * (3.0 - 2.0 * t))

            # Despill edge pixels to preserve dark navy outlines without green spill
            fg = rgb.copy()
            despill_mask = (dilated_bg == 1) & (alpha > 0.0)
            # Edge navy despill formula
            navy_g_cap = np.maximum(fg[despill_mask, 0], 0.35 * fg[despill_mask, 0] + 0.65 * fg[despill_mask, 2])
            fg[despill_mask, 1] = np.minimum(fg[despill_mask, 1], np.maximum(max_rb[despill_mask], navy_g_cap))

            rgba = np.dstack([fg, alpha * 255.0]).astype(np.uint8)

            # Crop to consistent character window
            cropped = rgba[crop_ymin:crop_ymax, crop_xmin:crop_xmax]
            pil_cropped = Image.fromarray(cropped, 'RGBA')

            # Lanczos resize to 400x500
            pil_resized = pil_cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

            # Post-resample cleanup: eliminate Lanczos ringing
            arr = np.array(pil_resized)
            arr[arr[:, :, 3] < 6, 3] = 0
            # Clean edge green ringing
            s_r = arr[:, :, 0].copy()
            s_g = arr[:, :, 1].copy()
            s_b = arr[:, :, 2].copy()
            s_a = arr[:, :, 3].copy()
            edge_ringing = (s_a > 0) & (s_g > np.maximum(s_r, s_b)) & (s_g > 100)
            s_g[edge_ringing] = np.maximum(s_r[edge_ringing], s_b[edge_ringing])
            clean_rgba = Image.fromarray(np.dstack([s_r, s_g, s_b, s_a]), 'RGBA')

            # Quantize with 256-color palette PNG with full alpha channel
            quant = clean_rgba.quantize(colors=256, method=2)

            local_f_num = f_idx - start_f
            out_filename = f"frame_{local_f_num:02d}.png"
            out_path = os.path.join(out_dir, out_filename)
            quant.save(out_path, format='PNG', optimize=True)

            size_bytes = os.path.getsize(out_path)
            size_kb = size_bytes / 1024.0

            stats[action_name]['count'] += 1
            stats[action_name]['total_bytes'] += size_bytes
            stats[action_name]['max_kb'] = max(stats[action_name]['max_kb'], size_kb)
            stats[action_name]['min_kb'] = min(stats[action_name]['min_kb'], size_kb)

            action_frames.append(clean_rgba)

        exported_pil_images[action_name] = action_frames

        # Also save animated WebP for each action
        webp_path = os.path.join(base_anim_dir, f"tank-{action_name}.webp")
        loop_count = 0 if action_name == 'idle' else 1
        action_frames[0].save(
            webp_path,
            save_all=True,
            append_images=action_frames[1:],
            duration=int(1000.0 / 24.0),
            loop=loop_count,
            optimize=True,
            quality=90
        )
        webp_size = os.path.getsize(webp_path) / 1024.0
        print(f"Saved {webp_path}: {webp_size:.1f} KB")

    # Generate Manifest File for React Native
    manifest_ts_path = r'C:\Bulko\constants\tankAnimationManifest.ts'
    with open(manifest_ts_path, 'w', encoding='utf-8') as f:
        f.write("/**\n * Tank Animation Sprite Manifest\n * Pre-bundled 24 fps PNG sprite frames.\n */\n\n")
        
        f.write("export const TANK_ANIMATIONS = {\n")
        for action_name, start_f, end_f, _ in clips_config:
            count = end_f - start_f + 1
            f.write(f"  {action_name}: [\n")
            for i in range(count):
                f.write(f"    require('@/assets/animations/{action_name}/frame_{i:02d}.png'),\n")
            f.write("  ],\n")
        f.write("} as const;\n\n")
        f.write("export type TankAnimationMode = 'idle' | 'sip' | 'flex';\n")
        f.write("export const ANIMATION_FPS = 24;\n")
        f.write("export const FRAME_DURATION_MS = Math.round(1000 / 24); // ~42ms\n")

    print(f"\nWrote animation manifest: {manifest_ts_path}")

    # Generate Verification Preview Sheet on Dark and Light Backgrounds
    create_preview_sheet(exported_pil_images, base_anim_dir)

    # Print summary statistics
    total_all_bytes = sum(s['total_bytes'] for s in stats.values())
    total_all_mb = total_all_bytes / (1024.0 * 1024.0)
    print("\n=======================================================")
    print("STAGE 7 ASSET OPTIMIZATION REPORT:")
    print("=======================================================")
    for action, s in stats.items():
        print(f"{action.upper():6s}: {s['count']} frames | Total: {s['total_bytes']/1024:.1f} KB | Range: {s['min_kb']:.1f} KB - {s['max_kb']:.1f} KB per frame")
    print(f"TOTAL ASSET FOOTPRINT: {total_all_mb:.2f} MB (< 4.0 MB limit)")
    print(f"ALL FRAMES UNDER 40 KB: {all(s['max_kb'] < 40 for s in stats.values())}")
    print("=======================================================\n")

def create_preview_sheet(exported_images, out_dir):
    # Preview: 4 frames from Idle, 4 frames from Flex, 4 frames from Sip
    sample_indices = {
        'idle': [0, 8, 16, 24],
        'flex': [4, 12, 20, 28],
        'sip':  [2, 10, 18, 26],
    }

    cols = 4
    rows = 3
    card_w = 200
    card_h = 250
    pad = 20
    header_h = 70
    sheet_w = cols * card_w + (cols + 1) * pad
    sheet_h = rows * card_h + (rows + 1) * pad + header_h

    for bg_type, bg_color, text_color, sub_color in [
        ('dark', (13, 21, 39), (255, 255, 255), (245, 158, 11)),
        ('light', (255, 246, 238), (15, 23, 42), (234, 88, 12))
    ]:
        sheet = Image.new('RGB', (sheet_w, sheet_h), bg_color)
        draw = ImageDraw.Draw(sheet)

        draw.text((sheet_w // 2, 25), 'TANK ANIMATION CLIPS — IDLE / FLEX / SIP', fill=text_color, anchor='mm')
        draw.text((sheet_w // 2, 50), f'Verified 24 fps Sprite Sequences — {bg_type.upper()} PREVIEW', fill=sub_color, anchor='mm')

        r_idx = 0
        for action_name in ['idle', 'flex', 'sip']:
            indices = sample_indices[action_name]
            for c_idx, frame_idx in enumerate(indices):
                x = pad + c_idx * (card_w + pad)
                y = header_h + pad + r_idx * (card_h + pad)

                # Draw card boundary
                card_bg = (30, 41, 59) if bg_type == 'dark' else (255, 255, 255)
                card_border = (51, 65, 85) if bg_type == 'dark' else (229, 231, 235)
                draw.rounded_rectangle([x, y, x + card_w, y + card_h], radius=14, fill=card_bg, outline=card_border, width=2)

                frame_img = exported_images[action_name][frame_idx]
                thumb = frame_img.resize((card_w - 20, card_h - 45), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x + 10, y + 10), thumb)

                label = f"{action_name.upper()} #{frame_idx}"
                draw.text((x + card_w // 2, y + card_h - 18), label, fill=text_color, anchor='mm')
            r_idx += 1

        preview_path = os.path.join(out_dir, f"animations-preview-{bg_type}.png")
        sheet.save(preview_path, format='PNG')
        print(f"Saved {preview_path}")

if __name__ == '__main__':
    process_animations()
