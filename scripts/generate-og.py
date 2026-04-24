#!/usr/bin/env python3
"""Generate src/pages/og.png — a 1200x630 Open Graph preview for unroll."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
BG = (11, 11, 15)
TEXT = (230, 230, 235)
MUTED = (138, 138, 149)
ACCENT = (29, 155, 240)
SURFACE = (21, 21, 27)
BORDER = (38, 38, 47)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "pages" / "og.png"

SFNS = "/System/Library/Fonts/SFNS.ttf"
HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"
MENLO = "/System/Library/Fonts/Menlo.ttc"


def load(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size=size, index=index)
    except (OSError, ValueError):
        return ImageFont.truetype(HELVETICA, size=size, index=index)


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    left, _, right, _ = draw.textbbox((0, 0), text, font=font)
    return right - left


def main() -> None:
    img = Image.new("RGB", (W, H), BG)

    # Soft accent glow behind the wordmark.
    glow = Image.new("RGB", (W, H), BG)
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((W // 2 - 520, 60, W // 2 + 520, 620), fill=(16, 44, 76))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=110))
    img = Image.blend(img, glow, alpha=0.55)

    # Subtle vignette — darken the corners a touch.
    vignette = Image.new("L", (W, H), 0)
    vdraw = ImageDraw.Draw(vignette)
    vdraw.ellipse((-200, -200, W + 200, H + 200), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=180))
    dark = Image.new("RGB", (W, H), BG)
    img = Image.composite(img, dark, vignette)

    draw = ImageDraw.Draw(img)

    # Thin accent bar along the top edge.
    draw.rectangle((0, 0, W, 4), fill=ACCENT)

    # Wordmark: un + roll. SFNS heavy face (index 8-ish is bold-ish; fall back if unavailable).
    wordmark_font = load(SFNS, 240, index=0)
    un = "un"
    roll = "roll"
    un_w = text_width(draw, un, wordmark_font)
    roll_w = text_width(draw, roll, wordmark_font)
    total = un_w + roll_w
    wm_top = 170
    x = (W - total) // 2
    draw.text((x, wm_top), un, font=wordmark_font, fill=TEXT)
    draw.text((x + un_w, wm_top), roll, font=wordmark_font, fill=ACCENT)

    # Tagline.
    tag_font = load(SFNS, 56)
    tagline = "Threads → Markdown"
    tw = text_width(draw, tagline, tag_font)
    draw.text(((W - tw) // 2, 440), tagline, font=tag_font, fill=TEXT)

    # Sub-tagline.
    sub_font = load(HELVETICA, 28)
    sub = "Paste any X/Twitter URL. Get clean markdown back."
    sw = text_width(draw, sub, sub_font)
    draw.text(((W - sw) // 2, 512), sub, font=sub_font, fill=MUTED)

    # Monospace snippet pill at the bottom.
    mono_font = load(MENLO, 22)
    snippet = "unroll.loa212.com/https://x.com/jack/status/20"
    snippet_w = text_width(draw, snippet, mono_font)
    pad_x, pad_y = 22, 14
    pill_w = snippet_w + pad_x * 2
    pill_h = 52
    pill_x = (W - pill_w) // 2
    pill_y = H - 90
    draw.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=12,
        fill=SURFACE,
        outline=BORDER,
        width=1,
    )
    # Offset the text a bit to vertically center inside the pill.
    draw.text((pill_x + pad_x, pill_y + pad_y - 2), snippet, font=mono_font, fill=MUTED)

    img.save(OUT, "PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
