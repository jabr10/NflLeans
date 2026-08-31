#!/usr/bin/env python3
"""Generate Footage lockups: two-ball wordmark, compact header, single-ball favicon."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
FONT_PATH = Path("/tmp/footage-fonts/BarlowCondensed-ExtraBold.ttf")
INK = (243, 246, 250, 255)  # #F3F6FA
LACE = (7, 9, 12, 255)  # #07090C
CLEAR = (0, 0, 0, 0)


def football_polygon(cx: float, cy: float, rx: float, ry: float, n: int = 120) -> list[tuple[float, float]]:
    """Pointed left/right, rounder top/bottom — Arthur’s football silhouette."""
    x_power = 2 / 1.22
    y_power = 2 / 1.85
    pts: list[tuple[float, float]] = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        x = rx * math.copysign(abs(c) ** x_power, c)
        y = ry * math.copysign(abs(s) ** y_power, s)
        pts.append((cx + x, cy + y))
    return pts


def draw_football(im: Image.Image, cx: float, cy: float, rx: float, ry: float) -> None:
    overlay = Image.new("RGBA", im.size, CLEAR)
    draw = ImageDraw.Draw(overlay)
    pts = football_polygon(cx, cy, rx, ry)
    draw.polygon(pts, fill=INK)

    lace_w = rx * 0.86
    x0, x1 = cx - lace_w / 2, cx + lace_w / 2
    bar_h = max(2.0, ry * 0.07)
    head = max(4.0, rx * 0.10)
    # Shaft
    draw.rectangle((x0 + head * 0.55, cy - bar_h / 2, x1 - head * 0.55, cy + bar_h / 2), fill=LACE)
    # Arrowheads
    draw.polygon(
        [
            (x0, cy),
            (x0 + head, cy - head * 0.55),
            (x0 + head, cy + head * 0.55),
        ],
        fill=LACE,
    )
    draw.polygon(
        [
            (x1, cy),
            (x1 - head, cy - head * 0.55),
            (x1 - head, cy + head * 0.55),
        ],
        fill=LACE,
    )
    # Stitches
    stitch_n = 8
    stitch_h = ry * 0.28
    stitch_t = max(1.5, rx * 0.035)
    inner0 = x0 + head * 1.05
    inner1 = x1 - head * 1.05
    for i in range(stitch_n):
        t = (i + 0.5) / stitch_n
        x = inner0 + (inner1 - inner0) * t
        draw.rectangle((x - stitch_t / 2, cy - stitch_h / 2, x + stitch_t / 2, cy + stitch_h / 2), fill=LACE)

    im.alpha_composite(overlay)


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def wordmark(letter_px: int, ball_scale: float = 1.08, gap_f: float = 0.02, gap_balls: float = 0.02, gap_tage: float = 0.05) -> Image.Image:
    font = ImageFont.truetype(str(FONT_PATH), letter_px)
    f_box = font.getbbox("F")
    tage_box = font.getbbox("TAGE")
    f_w = f_box[2] - f_box[0]
    f_h = f_box[3] - f_box[1]
    tage_w = tage_box[2] - tage_box[0]
    tage_h = tage_box[3] - tage_box[1]
    glyph_h = max(f_h, tage_h)

    ball_h = glyph_h * ball_scale
    ball_w = ball_h * 1.70
    gap1 = glyph_h * gap_f
    gap2 = glyph_h * gap_balls
    gap3 = glyph_h * gap_tage

    pad = int(glyph_h * 0.12)
    content_h = max(glyph_h, ball_h)
    width = int(pad * 2 + f_w + gap1 + ball_w + gap2 + ball_w + gap3 + tage_w)
    height = int(content_h + pad * 2)
    im = Image.new("RGBA", (width, height), CLEAR)
    draw = ImageDraw.Draw(im)

    extra_top = (content_h - glyph_h) / 2
    letter_top = pad + extra_top
    cy = pad + content_h / 2

    x = float(pad)
    draw.text((x - f_box[0], letter_top - f_box[1]), "F", font=font, fill=INK)
    x += f_w + gap1

    bx = x + ball_w / 2
    draw_football(im, bx, cy, ball_w / 2, ball_h / 2)
    x += ball_w + gap2
    bx = x + ball_w / 2
    draw_football(im, bx, cy, ball_w / 2, ball_h / 2)
    x += ball_w + gap3

    draw.text((x - tage_box[0], letter_top - tage_box[1]), "TAGE", font=font, fill=INK)
    return trim(im, pad=max(2, letter_px // 50))


def favicon(size: int = 512) -> Image.Image:
    im = Image.new("RGBA", (size, size), (7, 9, 12, 255))
    cx = cy = size / 2
    rx = size * 0.40
    ry = size * 0.26
    draw_football(im, cx, cy, rx, ry)
    return im.convert("RGB")


def main() -> None:
    public = ROOT / "public"
    brand = public / "brand"
    app = ROOT / "src" / "app"
    brand.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)

    full = wordmark(letter_px=280)
    # Target ~3x header height (~84px) while keeping native detail.
    target_h = 168
    scale = target_h / full.height
    full_out = full.resize((max(1, int(full.width * scale)), target_h), Image.Resampling.LANCZOS)
    full_path = public / "footage-wordmark.png"
    full_out.save(full_path, "PNG")

    compact_src = wordmark(letter_px=200)
    compact_w = 280  # 2x of ~140px
    scale = compact_w / compact_src.width
    compact_out = compact_src.resize((compact_w, max(1, int(compact_src.height * scale))), Image.Resampling.LANCZOS)
    compact_path = public / "footage-wordmark-compact.png"
    compact_out.save(compact_path, "PNG")

    mark = favicon(512)
    mark_path = public / "footage-mark.png"
    mark.save(mark_path, "PNG")

    icon32 = mark.resize((32, 32), Image.Resampling.LANCZOS)
    icon192 = mark.resize((192, 192), Image.Resampling.LANCZOS)
    apple = mark.resize((180, 180), Image.Resampling.LANCZOS)
    icon192.save(app / "icon.png", "PNG")
    apple.save(app / "apple-icon.png", "PNG")
    icon32.save(public / "favicon-32.png", "PNG")

    print(f"full {full_out.size} -> {full_path}")
    print(f"compact {compact_out.size} -> {compact_path}")
    print(f"mark {mark.size} -> {mark_path}")
    print(f"icon {icon192.size} apple {apple.size}")


if __name__ == "__main__":
    main()
