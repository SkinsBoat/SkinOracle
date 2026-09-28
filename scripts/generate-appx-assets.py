#!/usr/bin/env python3
"""Generate Microsoft Store (AppX) tile assets for SkinOracle.

electron-builder falls back to its generic Electron placeholder tiles
(SampleAppx.*.png) when no AppX assets are supplied, which violates Microsoft
Store policy 10.1.1.11 ("On Device Tiles"). This script derives transparent,
product-specific tile artwork from assets/icon.png so the Start tiles, Store
listing, and taskbar icons uniquely represent SkinOracle.

Requires: Pillow  (pip install Pillow)
Usage:    python3 scripts/generate-appx-assets.py
"""

import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "assets", "icon.png")
OUT_DIR = os.path.join(ROOT, "build", "appx")

# electron-builder required/optional AppX assets.
# filename -> (canvas width, canvas height, content fraction of the shortest edge)
ASSETS = {
    "StoreLogo.png": (50, 50, 0.86),
    "Square44x44Logo.png": (44, 44, 0.72),
    "Square150x150Logo.png": (150, 150, 0.74),
    "Wide310x150Logo.png": (310, 150, 0.66),
    "SmallTile.png": (71, 71, 0.72),
    "LargeTile.png": (310, 310, 0.72),
}

# White background removal thresholds (min channel value).
NEAR_WHITE = 248
SOLID = 195


def remove_white_background(image):
    """Return a copy with white background turned transparent.

    Solid artwork keeps its exact colors; only near-white pixels are dropped,
    with a linear ramp across the anti-aliased boundary. Partially transparent
    pixels are un-premultiplied so edges stay crisp when composited.
    """
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            m = min(r, g, b)
            if m >= NEAR_WHITE:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            coverage = 1.0 if m <= SOLID else (NEAR_WHITE - m) / (NEAR_WHITE - SOLID)
            alpha = a / 255.0 * coverage
            if coverage < 1.0 and coverage > 0.0:
                # Undo the blend with the white background: C = (P - (1-a)*255) / a
                inv = 255.0 * (1.0 - coverage)
                r = max(0, min(255, int(round((r - inv) / coverage))))
                g = max(0, min(255, int(round((g - inv) / coverage))))
                b = max(0, min(255, int(round((b - inv) / coverage))))
            pixels[x, y] = (r, g, b, int(round(alpha * 255)))

    return image


def ink_bounds(image):
    """Bounding box of colored artwork, ignoring residual white/grey pixels."""
    pixels = image.load()
    width, height = image.size
    min_x, min_y, max_x, max_y = width, height, -1, -1

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 32 and (max(r, g, b) - min(r, g, b)) >= 25:
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y

    if max_x < 0:
        raise RuntimeError("No colored artwork found in %s" % SOURCE)
    return (min_x, min_y, max_x + 1, max_y + 1)


def contain(image, box_size):
    """Scale image to fit inside a box_size square without distortion."""
    width, height = image.size
    scale = min(box_size / float(width), box_size / float(height))
    return image.resize(
        (max(1, int(round(width * scale))), max(1, int(round(height * scale)))),
        Image.LANCZOS,
    )


def main():
    logo = remove_white_background(Image.open(SOURCE))
    logo = logo.crop(ink_bounds(logo))

    os.makedirs(OUT_DIR, exist_ok=True)
    for name, (canvas_w, canvas_h, fraction) in ASSETS.items():
        target = contain(logo, int(round(min(canvas_w, canvas_h) * fraction)))
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
        canvas.paste(
            target,
            ((canvas_w - target.size[0]) // 2, (canvas_h - target.size[1]) // 2),
        )
        canvas.save(os.path.join(OUT_DIR, name))
        print("wrote %s (%dx%d)" % (name, canvas_w, canvas_h))


if __name__ == "__main__":
    main()
