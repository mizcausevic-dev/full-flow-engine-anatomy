"""Composite a titled hero from the generated plate. Text is set in real fonts."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SRC = Path("/opt/cursor/artifacts/assets/hero-engine-plate.jpg")
OUT = Path("/workspace/public/hero-Cursor.jpg")

WIDTH, HEIGHT = 1600, 900
image = Image.open(SRC).convert("RGB")
scale = max(WIDTH / image.width, HEIGHT / image.height)
resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
left = (resized.width - WIDTH) // 2
top = max(0, (resized.height - HEIGHT) // 2 - 20)
plate = resized.crop((left, top, left + WIDTH, top + HEIGHT))

scrim = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
pixels = scrim.load()
for x in range(WIDTH):
    # Darken the left third so the title sits on steel, not on a highlight.
    alpha = int(210 * max(0.0, 1 - x / 760) ** 1.15)
    if alpha <= 0:
        continue
    for y in range(HEIGHT):
        pixels[x, y] = (11, 16, 25, alpha)

composed = plate.convert("RGBA")
composed.alpha_composite(scrim)
draw = ImageDraw.Draw(composed)

mono = ImageFont.truetype("/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Medium.ttf", 18)
display = ImageFont.truetype("/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf", 64)
body = ImageFont.truetype("/usr/share/fonts/truetype/macos/Inter-Regular.ttf", 22)
small = ImageFont.truetype("/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf", 16)

cyan = (0, 229, 255, 255)
bone = (231, 237, 244, 255)
muted = (180, 190, 204, 255)
gold = (255, 209, 102, 255)

draw.text((56, 78), "AEROSPACE  \u00b7  34 SECONDS  \u00b7  1,020 FRAMES", font=mono, fill=cyan)
title = "The turbine exhaust\nis still propellant."
draw.multiline_text((56, 130), title, font=display, fill=bone, spacing=6)
draw.multiline_text(
    (56, 300),
    "A sectional model of full-flow staged combustion.\nRaptor-inspired. No invented pressures, shaft speeds,\nor mixture ratios.",
    font=body,
    fill=muted,
    spacing=6,
)
draw.rectangle((56, HEIGHT - 78, 96, HEIGHT - 74), fill=gold)
draw.text((108, HEIGHT - 88), "KINETIC GAIN LLC", font=small, fill=bone)

OUT.parent.mkdir(parents=True, exist_ok=True)
composed.convert("RGB").save(OUT, quality=90, optimize=True)
print(f"wrote {OUT} {OUT.stat().st_size}")
