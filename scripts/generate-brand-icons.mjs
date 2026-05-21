#!/usr/bin/env node
/**
 * Regenerate static brand icons (favicon, PNG sizes) from the NS mark design.
 * Requires: python3 with Pillow (`pip install pillow`).
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

const script = `
from PIL import Image, ImageDraw, ImageFont

GREEN = (0x9D, 0xC4, 0x1A, 255)
BLACK = (0, 0, 0, 255)

def draw_mark(size, radius_ratio=0.1875):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = max(2, int(size * radius_ratio))
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=GREEN)
    font_size = max(8, int(size * 0.38))
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", font_size)
    except OSError:
        font = ImageFont.load_default()
    text = "NS"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - 1), text, fill=BLACK, font=font)
    return img

public_dir = ${JSON.stringify(publicDir)}
app_dir = ${JSON.stringify(appDir)}

for size in (16, 32, 48, 180, 512):
    draw_mark(size).save(f"{public_dir}/icon-{size}.png")

icons = [draw_mark(s) for s in (16, 32, 48)]
icons[0].save(
    f"{public_dir}/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=icons[1:],
)
draw_mark(180).save(f"{public_dir}/apple-touch-icon.png")

# Open Graph / WhatsApp preview (1200x630) — compact mark + English tagline
og_w, og_h = 1200, 630
og = Image.new("RGBA", (og_w, og_h), (0x1A, 0x1A, 0x1A, 255))
draw_og = ImageDraw.Draw(og)
mark_size = 140
mark = draw_mark(mark_size)
title_line = "ULTRA CONTENT MAKER"
subtitle_line = "AI Ghostwriter for LinkedIn"
title_size = 44
subtitle_size = 34
try:
    title_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", title_size)
    subtitle_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", subtitle_size)
except OSError:
    title_font = ImageFont.load_default()
    subtitle_font = title_font
tb1 = draw_og.textbbox((0, 0), title_line, font=title_font)
tb2 = draw_og.textbbox((0, 0), subtitle_line, font=subtitle_font)
tw1, th1 = tb1[2] - tb1[0], tb1[3] - tb1[1]
tw2, th2 = tb2[2] - tb2[0], tb2[3] - tb2[1]
gap_mark = 32
gap_lines = 10
text_block_h = th1 + gap_lines + th2
block_h = mark_size + gap_mark + text_block_h
y0 = (og_h - block_h) // 2
og.paste(mark, ((og_w - mark_size) // 2, y0), mark)
text_y = y0 + mark_size + gap_mark
draw_og.text(
    ((og_w - tw1) // 2, text_y),
    title_line,
    fill=(255, 255, 255, 255),
    font=title_font,
)
draw_og.text(
    ((og_w - tw2) // 2, text_y + th1 + gap_lines),
    subtitle_line,
    fill=(230, 230, 230, 255),
    font=subtitle_font,
)
og.convert("RGB").save(f"{public_dir}/og-image.png", format="PNG", optimize=True)

import shutil
shutil.copy(f"{public_dir}/favicon.ico", f"{app_dir}/favicon.ico")
shutil.copy(f"{public_dir}/icon-32.png", f"{app_dir}/icon.png")
shutil.copy(f"{public_dir}/apple-touch-icon.png", f"{app_dir}/apple-icon.png")
print("Brand icons written to public/ and src/app/ (incl. og-image.png)")
`;

execFileSync("python3", ["-c", script], { stdio: "inherit" });
