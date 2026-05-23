"""
Build the 3-slide Flow State LinkedIn carousel.

Visual language pulled from src/data/colors.js + DESIGN.md:
- Sky #38BDF8 -> Coral #FF6B6B -> Sand #FEF9EF gradient.
- Dela Gothic One display, Nunito body.
- Coral pills, yellow accents, dark text.
"""

from __future__ import annotations

import functools
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
EMOJI_FONT_PATH = os.path.join(FONTS, "NotoColorEmoji.ttf")
EMOJI_NATIVE = 109  # Noto Color Emoji bitmaps are 109px

W, H = 1080, 1350  # LinkedIn 4:5

# Palette (from src/data/colors.js)
SKY = (56, 189, 248)
SKY_LIGHT = (125, 211, 252)
TURQUOISE = (0, 206, 201)
FLOW = (93, 210, 217)
CORAL = (255, 107, 107)
CORAL_DEEP = (232, 69, 60)
YELLOW = (255, 217, 61)
GOLD = (245, 158, 11)
GREEN = (0, 184, 148)
PALM = (21, 128, 61)
SAND = (254, 249, 239)
SAND_DARK = (245, 237, 224)
WHITE = (255, 255, 255)
DARK = (26, 26, 46)
DARK_SOFT = (45, 45, 68)
TEXT_BODY = (74, 74, 106)
PINK = (249, 168, 212)
BLUE = (59, 130, 246)
PURPLE = (168, 85, 247)


def font(name: str, size: int, weight: int | None = None) -> ImageFont.FreeTypeFont:
    path = os.path.join(FONTS, name)
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def dela(size: int) -> ImageFont.FreeTypeFont:
    return font("DelaGothicOne.ttf", size)


def nunito(size: int, weight: int = 800) -> ImageFont.FreeTypeFont:
    return font("Nunito-Black.ttf", size, weight)


@functools.lru_cache(maxsize=128)
def emoji_bitmap(char: str, target_size: int) -> Image.Image:
    """Render one emoji at native bitmap size then resize to target_size."""
    f = ImageFont.truetype(EMOJI_FONT_PATH, EMOJI_NATIVE)
    canvas = Image.new("RGBA", (EMOJI_NATIVE + 40, EMOJI_NATIVE + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    d.text((20, 20), char, font=f, embedded_color=True)
    # crop to content
    bbox = canvas.getbbox()
    if bbox:
        canvas = canvas.crop(bbox)
    # resize preserving aspect to target height
    ratio = target_size / canvas.height
    new_w = max(1, int(canvas.width * ratio))
    return canvas.resize((new_w, target_size), Image.LANCZOS)


def draw_emoji(img: Image.Image, xy, char: str, size: int):
    """Paste an emoji bitmap onto img at top-left xy."""
    em = emoji_bitmap(char, size)
    img.alpha_composite(em, (int(xy[0]), int(xy[1])))
    return em.width


# --- Helpers ----------------------------------------------------------------

def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def lerp_color(c1, c2, t: float):
    return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def gradient_bg(size=(W, H)) -> Image.Image:
    """Sky -> coral -> sand vertical gradient with a soft radial sun glow."""
    w, h = size
    img = Image.new("RGB", (w, h), SAND)
    px = img.load()

    stops = [
        (0.00, (96, 196, 250)),    # bright sky
        (0.35, (255, 138, 130)),   # coral haze
        (0.65, (255, 180, 130)),   # warm peach
        (1.00, SAND),
    ]

    for y in range(h):
        t = y / (h - 1)
        for i in range(len(stops) - 1):
            t0, c0 = stops[i]
            t1, c1 = stops[i + 1]
            if t0 <= t <= t1:
                tt = (t - t0) / (t1 - t0)
                c = lerp_color(c0, c1, tt)
                break
        else:
            c = stops[-1][1]
        for x in range(w):
            px[x, y] = c

    # Soft sun glow upper-right
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = int(w * 0.82), int(h * 0.18)
    for r in range(420, 0, -18):
        a = int(60 * (1 - r / 420) ** 2)
        gd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 240, 200, a))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    # film grain
    grain = Image.effect_noise((w, h), 6).convert("L")
    grain = grain.point(lambda v: int(v * 0.10))
    img.paste(WHITE, (0, 0), grain)

    return img


def rounded_rect_mask(size, radius) -> Image.Image:
    w, h = size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w, h), radius, fill=255)
    return mask


def with_shadow(card: Image.Image, blur=30, offset=(0, 18), opacity=110) -> Image.Image:
    """Return a new RGBA image larger than card containing shadow + card."""
    pad = blur * 2 + max(abs(offset[0]), abs(offset[1])) + 10
    w, h = card.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    alpha = card.split()[-1]
    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_layer.paste((0, 0, 0, opacity), (pad + offset[0], pad + offset[1]), alpha)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    canvas.alpha_composite(card, (pad, pad))
    return canvas


def paste_rotated(base: Image.Image, layer: Image.Image, center_xy, angle_deg: float):
    rot = layer.rotate(angle_deg, resample=Image.BICUBIC, expand=True)
    cx, cy = center_xy
    x = cx - rot.width // 2
    y = cy - rot.height // 2
    base.alpha_composite(rot, (x, y))


def text_size(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0], b[3] - b[1]


# --- Mockup pieces -----------------------------------------------------------

def flow_state_inline(text_size_px=72, color=DARK) -> Image.Image:
    """One-line 'FLOW STATE' lockup with coral dot."""
    f = dela(text_size_px)
    tmp = Image.new("RGBA", (1, 1))
    d = ImageDraw.Draw(tmp)
    label = "FLOW STATE"
    w, h = text_size(d, label, f)
    dot_r = int(text_size_px * 0.14)
    img = Image.new("RGBA", (w + dot_r * 4, h + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((0, 0), label, font=f, fill=color)
    cy = h - int(dot_r * 1.3)
    d.ellipse((w + dot_r, cy - dot_r, w + dot_r * 3, cy + dot_r), fill=CORAL)
    return img


def countdown_card(scale=1.0) -> Image.Image:
    """Dark-glass countdown like Countdown.jsx — 4 digit squares + label."""
    pad = int(32 * scale)
    sq = int(120 * scale)
    gap = int(18 * scale)
    inner_w = sq * 4 + gap * 3
    w = inner_w + pad * 2
    h = int(82 * scale) + sq + int(28 * scale) + pad * 2

    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_rect_mask((w, h), int(34 * scale))
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(bg).rounded_rectangle((0, 0, w, h), int(34 * scale), fill=(26, 26, 46, 245))
    card.paste(bg, (0, 0), mask)

    d = ImageDraw.Draw(card)

    eb = nunito(int(20 * scale), 900)
    d.text((pad, pad - int(4 * scale)), "PUNTA CANA · MAY 18", font=eb, fill=YELLOW)
    hf = dela(int(34 * scale))
    d.text((pad, pad + int(26 * scale)), "we leave in", font=hf, fill=WHITE)

    digits = [("06", "days"), ("14", "hrs"), ("22", "min"), ("47", "sec")]
    df = dela(int(54 * scale))
    lf = nunito(int(16 * scale), 800)
    sq_y = pad + int(82 * scale)
    for i, (val, lab) in enumerate(digits):
        x = pad + i * (sq + gap)
        sub = Image.new("RGBA", (sq, sq), (0, 0, 0, 0))
        ImageDraw.Draw(sub).rounded_rectangle(
            (0, 0, sq, sq), int(20 * scale), fill=(255, 255, 255, 32),
        )
        card.alpha_composite(sub, (x, sq_y))
        sd = ImageDraw.Draw(card)
        tw, th = text_size(sd, val, df)
        sd.text((x + (sq - tw) / 2, sq_y + int(20 * scale)), val, font=df, fill=WHITE)
        lw, lh = text_size(sd, lab, lf)
        sd.text((x + (sq - lw) / 2, sq_y + sq - int(28 * scale)), lab, font=lf,
                fill=(255, 255, 255, 140))

    return card


def itinerary_card(scale=1.0) -> Image.Image:
    """Day card from the itinerary — accent header, day title, item rows w/ emoji."""
    w = int(560 * scale)
    pad = int(28 * scale)
    items = [
        ("06:30", "Pickup from resort", "🚐"),
        ("09:30", "Boat departure", "⛵"),
        ("11:30", "Saona Island + lunch", "🏝️"),
        ("16:00", "Return journey", "🚤"),
        ("Eve",   "Caribbean Night", "🌴"),
    ]
    row_h = int(58 * scale)
    header_h = int(132 * scale)
    h = header_h + int(8 * scale) + row_h * len(items) + pad

    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_rect_mask((w, h), int(28 * scale))
    bg = Image.new("RGBA", (w, h), WHITE + (255,))
    card.paste(bg, (0, 0), mask)

    # accent header — coral block clipped to rounded top
    header_block = Image.new("RGBA", (w, header_h), (0, 0, 0, 0))
    ImageDraw.Draw(header_block).rectangle((0, 0, w, header_h), fill=CORAL + (255,))
    full_mask = rounded_rect_mask((w, h), int(28 * scale))
    header_mask = full_mask.crop((0, 0, w, header_h))
    card.paste(CORAL, (0, 0), header_mask)

    d = ImageDraw.Draw(card)

    eb = nunito(int(18 * scale), 900)
    d.text((pad, pad - int(2 * scale)), "DAY 4 · THU 21 MAY", font=eb,
           fill=(255, 255, 255, 235))
    title_f = dela(int(34 * scale))
    d.text((pad, pad + int(20 * scale)), "Saona Island", font=title_f, fill=WHITE)
    tag_f = nunito(int(18 * scale), 700)
    d.text((pad, pad + int(72 * scale)), "island hopping & starfish", font=tag_f,
           fill=(255, 255, 255, 220))

    # rows
    sf = nunito(int(16 * scale), 800)
    tf = nunito(int(20 * scale), 700)
    y0 = header_h + int(8 * scale)
    em_size = int(28 * scale)
    for i, (time, act, icon) in enumerate(items):
        y = y0 + i * row_h
        tp_x = pad
        tp_w = int(86 * scale)
        tp_h = int(34 * scale)
        d.rounded_rectangle((tp_x, y, tp_x + tp_w, y + tp_h),
                            int(10 * scale), fill=(255, 107, 107, 38))
        tw, th = text_size(d, time, sf)
        d.text((tp_x + (tp_w - tw) / 2, y + (tp_h - th) / 2 - int(2 * scale)),
               time, font=sf, fill=CORAL_DEEP)
        # emoji
        draw_emoji(card, (tp_x + tp_w + int(12 * scale), y + int(3 * scale)),
                   icon, em_size)
        d.text((tp_x + tp_w + int(48 * scale), y + int(4 * scale)), act,
               font=tf, fill=DARK)
        if i < len(items) - 1:
            d.line((pad, y + row_h - int(4 * scale),
                    w - pad, y + row_h - int(4 * scale)),
                   fill=(0, 0, 0, 20), width=1)

    return card


def post_card(
    name: str,
    color,
    initials: str,
    text: str,
    when: str,
    emoji_reactions: list[tuple[str, int]],
    catchphrase: str = "",
    scale=1.0,
    width: int | None = None,
    body_inline_emoji: list[tuple[int, str]] = None,
) -> Image.Image:
    """Captions-wall post card. Avatar + name + text + reaction pills.

    body_inline_emoji: list of (char_index_in_text_to_replace, emoji) — kept simple
    by appending emoji at end of line instead, so we ignore.
    """
    w = width or int(540 * scale)
    pad = int(20 * scale)
    avatar = int(48 * scale)

    body_f = nunito(int(22 * scale), 700)
    tmp = Image.new("RGBA", (1, 1))
    td = ImageDraw.Draw(tmp)
    max_text_w = w - pad * 2

    # split text by spaces but preserve emoji-as-tokens so we can swap glyphs
    EMOJIS = {"💭", "🤖", "😂", "🙌", "🥹", "🔥", "😭", "🌴", "🛠️", "🚀", "👇"}

    def is_emoji(tok: str) -> bool:
        return tok in EMOJIS

    tokens = text.split()
    # build lines as list of (token, is_emoji)
    lines: list[list[tuple[str, bool]]] = [[]]
    cur_w = 0
    em_size = int(26 * scale)
    space_w = text_size(td, " ", body_f)[0]
    for tok in tokens:
        em = is_emoji(tok)
        if em:
            tw = em_size + int(2 * scale)
        else:
            tw = text_size(td, tok, body_f)[0]
        extra = space_w if lines[-1] else 0
        if cur_w + extra + tw <= max_text_w:
            lines[-1].append((tok, em))
            cur_w += extra + tw
        else:
            lines.append([(tok, em)])
            cur_w = tw

    line_h = int(32 * scale)
    text_block_h = max(0, len(lines) * line_h)

    header_h = avatar + int(8 * scale)
    reactions_h = int(40 * scale) if emoji_reactions else 0
    h = pad + header_h + int(10 * scale) + text_block_h + int(14 * scale) + reactions_h + pad

    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = rounded_rect_mask((w, h), int(22 * scale))
    card.paste(WHITE + (255,), (0, 0), mask)

    d = ImageDraw.Draw(card)

    # avatar circle with initial
    ax, ay = pad, pad
    d.ellipse((ax, ay, ax + avatar, ay + avatar), fill=color)
    inf = nunito(int(20 * scale), 900)
    iw, ih = text_size(d, initials, inf)
    d.text((ax + (avatar - iw) / 2, ay + (avatar - ih) / 2 - int(2 * scale)),
           initials, font=inf, fill=WHITE)

    nf = nunito(int(18 * scale), 900)
    d.text((ax + avatar + int(12 * scale), ay + int(2 * scale)),
           name, font=nf, fill=color)
    sf = nunito(int(14 * scale), 700)
    if catchphrase:
        d.text((ax + avatar + int(12 * scale), ay + int(22 * scale)),
               f"“{catchphrase}”", font=sf, fill=(120, 120, 140))
    d.text((ax + avatar + int(12 * scale), ay + int(38 * scale)),
           when, font=sf, fill=(150, 150, 170))

    # body
    y = pad + header_h + int(10 * scale)
    for line in lines:
        x = pad
        for j, (tok, em) in enumerate(line):
            if em:
                draw_emoji(card, (x, y + int(2 * scale)), tok, em_size)
                x += em_size + int(2 * scale)
            else:
                d.text((x, y), tok, font=body_f, fill=DARK)
                x += text_size(d, tok, body_f)[0]
            if j < len(line) - 1:
                x += space_w
        y += line_h

    # reactions
    if emoji_reactions:
        rx = pad
        ry = h - pad - int(34 * scale)
        for em_char, count in emoji_reactions:
            ef = nunito(int(18 * scale), 800)
            count_str = f" {count}"
            tw, th = text_size(d, count_str, ef)
            em_h = int(22 * scale)
            pill_w = int(28 * scale) + em_h + tw + int(14 * scale)
            pill_h = int(32 * scale)
            d.rounded_rectangle((rx, ry, rx + pill_w, ry + pill_h),
                                int(16 * scale), fill=(0, 0, 0, 14))
            draw_emoji(card, (rx + int(8 * scale), ry + int(4 * scale)),
                       em_char, em_h)
            d.text((rx + int(8 * scale) + em_h + int(4 * scale),
                    ry + int(5 * scale)),
                   str(count), font=ef, fill=DARK)
            rx += pill_w + int(8 * scale)

    return card


def captions_wall_stack(scale=1.0) -> Image.Image:
    pad = int(24 * scale)
    width = int(620 * scale)

    posts = [
        post_card(
            "kai", TURQUOISE, "K",
            "imagine a wall where we could all post stuff this week 💭",
            "sat · 9:42am",
            [("💭", 4), ("🔥", 6)],
            "the chairman",
            scale=scale, width=width - pad * 2,
        ),
        post_card(
            "khari", CORAL, "K",
            "say no more — going to my room to cook. brb",
            "sat · 9:48am",
            [("🤖", 7), ("😂", 3)],
            "the architect",
            scale=scale, width=width - pad * 2,
        ),
        post_card(
            "candice", GOLD, "C",
            "3 hours later he comes back with a whole wall app 🙌",
            "sat · 1:11pm",
            [("🙌", 9), ("🥹", 4), ("🔥", 5)],
            "captain vibes",
            scale=scale, width=width - pad * 2,
        ),
    ]

    total_h = pad + int(54 * scale)
    total_h += sum(p.height + int(14 * scale) for p in posts) - int(14 * scale)
    total_h += pad
    h = total_h

    wall = Image.new("RGBA", (width, h), (0, 0, 0, 0))
    mask = rounded_rect_mask((width, h), int(30 * scale))
    wall.paste(SAND + (255,), (0, 0), mask)

    d = ImageDraw.Draw(wall)
    d.text((pad, pad - int(4 * scale)), "THE CAPTIONS WALL",
           font=nunito(int(16 * scale), 900), fill=CORAL_DEEP)
    d.text((pad, pad + int(14 * scale)), "post anything. the crew can see.",
           font=nunito(int(16 * scale), 700), fill=TEXT_BODY)

    dot_x = width - pad - int(110 * scale)
    dot_y = pad + int(12 * scale)
    d.ellipse((dot_x, dot_y, dot_x + int(12 * scale), dot_y + int(12 * scale)),
              fill=GREEN)
    d.text((dot_x + int(20 * scale), dot_y - int(4 * scale)),
           "live", font=nunito(int(16 * scale), 900), fill=GREEN)

    y = pad + int(54 * scale)
    for p in posts:
        wall.alpha_composite(p, (pad, y))
        y += p.height + int(14 * scale)

    return wall


def small_chip(text: str, bg, fg=WHITE, scale=1.0) -> Image.Image:
    f = nunito(int(20 * scale), 900)
    tmp = Image.new("RGBA", (1, 1))
    d = ImageDraw.Draw(tmp)
    tw, th = text_size(d, text, f)
    pad_x = int(18 * scale)
    pad_y = int(10 * scale)
    w = tw + pad_x * 2
    h = th + pad_y * 2
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, w, h), int(h / 2), fill=bg)
    ImageDraw.Draw(img).text((pad_x, pad_y - int(2 * scale)), text, font=f, fill=fg)
    return img


# --- Slides ------------------------------------------------------------------

def slide_one() -> Image.Image:
    img = gradient_bg().convert("RGBA")
    d = ImageDraw.Draw(img)

    # Top eyebrow with coral underline
    eb = nunito(26, 900)
    d.text((64, 60), "FLOW STATE · A HOLIDAY APP", font=eb,
           fill=(255, 255, 255, 240))
    d.rounded_rectangle((64, 96, 64 + 100, 100), 3, fill=CORAL)

    # Hero stacked type
    f1 = dela(102)
    f2 = dela(126)
    line1 = "i built a"
    line2 = "holiday app"
    line3 = "on holiday"

    tmp = ImageDraw.Draw(img)
    _, h1h = text_size(tmp, line1, f1)
    _, h2h = text_size(tmp, line2, f2)
    line3_w, h3h = text_size(tmp, line3, f2)

    x = 64
    top = 140
    d.text((x, top), line1, font=f1, fill=DARK)
    d.text((x, top + h1h + 12), line2, font=f2, fill=DARK)
    line3_y = top + h1h + h2h + 28
    d.text((x, line3_y), line3, font=f2, fill=DARK)
    # palm next to "on holiday"
    draw_emoji(img, (x + line3_w + 20, line3_y + 8), "🌴", 100)

    # subline
    sub = nunito(26, 700)
    d.text((x, line3_y + h3h + 30),
           "5 friends. 7 days. punta cana.",
           font=sub, fill=(255, 255, 255, 240))

    # chips row
    chips = [
        ("itinerary", CORAL),
        ("captions wall", TURQUOISE),
        ("points game", GOLD),
        ("crew", BLUE),
    ]
    cx = x
    cy = line3_y + h3h + 70
    for label, c in chips:
        chip = small_chip(label, c, WHITE, scale=0.9)
        img.alpha_composite(chip, (cx, cy))
        cx += chip.width + 10

    # Floating mockups bottom area — they intentionally float partially off
    # the bottom for a keynote/dribbble feel.
    it = itinerary_card(scale=0.88)
    it_s = with_shadow(it, blur=44, offset=(0, 24), opacity=140)
    paste_rotated(img, it_s, (230, 1080), -8)

    cd = countdown_card(scale=0.7)
    cd_s = with_shadow(cd, blur=44, offset=(0, 24), opacity=140)
    paste_rotated(img, cd_s, (820, 950), 6)

    pc = post_card(
        "kai", TURQUOISE, "K",
        "we land in 6 days 🔥",
        "today · 9:01am",
        [("🔥", 8), ("🌴", 5)],
        "the chairman",
        scale=0.78, width=440,
    )
    pc_s = with_shadow(pc, blur=36, offset=(0, 18), opacity=120)
    paste_rotated(img, pc_s, (820, 1190), -4)

    # swipe indicator + page marker
    sw_f = nunito(28, 900)
    txt = "swipe →"
    tw, th = text_size(d, txt, sw_f)
    d.text((W - 64 - tw, H - 70), txt, font=sw_f, fill=DARK)
    pm = nunito(22, 900)
    d.text((64, H - 70), "1 / 3", font=pm, fill=(255, 255, 255, 235))

    return img.convert("RGB")


def slide_two() -> Image.Image:
    img = gradient_bg().convert("RGBA")
    d = ImageDraw.Draw(img)

    # Top tag
    eb = nunito(24, 900)
    d.text((64, 60), "THE CAPTIONS WALL", font=eb, fill=(255, 255, 255, 240))
    d.rounded_rectangle((64, 92, 64 + 100, 96), 3, fill=YELLOW)

    f_big = dela(82)
    f_med = dela(54)
    f_quote = nunito(32, 900)
    f_body = nunito(28, 800)

    x = 64
    y = 130
    d.text((x, y), "saturday.", font=f_big, fill=DARK)
    y += 88
    d.text((x, y), "breakfast.", font=f_big, fill=CORAL_DEEP)
    y += 110

    d.text((x, y), "someone said:", font=f_body, fill=(40, 40, 60, 230))
    y += 40
    d.text((x, y), "“imagine a wall where we could",
           font=f_quote, fill=WHITE)
    y += 40
    d.text((x, y), "all post stuff”", font=f_quote, fill=WHITE)
    # bubble emoji next to last line
    quote2_w, _ = text_size(d, "all post stuff”", f_quote)
    draw_emoji(img, (x + quote2_w + 14, y - 2), "💭", 40)
    y += 70

    d.text((x, y), "i went straight", font=f_med, fill=DARK)
    y += 58
    d.text((x, y), "to my room.", font=f_med, fill=DARK)
    y += 80

    punch_f = nunito(32, 900)
    d.text((x, y), "3 hours later", font=punch_f, fill=DARK)
    pw, ph = text_size(d, "3 hours later", punch_f)
    draw_emoji(img, (x + pw + 12, y - 2), "👇", 36)

    # The captions wall mockup — big, slightly tilted, anchored to fit
    wall = captions_wall_stack(scale=0.72)
    wall_s = with_shadow(wall, blur=50, offset=(0, 28), opacity=150)
    # right-centered so the tilted card still fits inside the canvas
    paste_rotated(img, wall_s, (W // 2 + 170, 950), -3)

    # page marker
    pm = nunito(22, 900)
    d.text((64, H - 55), "2 / 3", font=pm, fill=(255, 255, 255, 235))
    sw_f = nunito(24, 900)
    txt = "swipe →"
    tw, th = text_size(d, txt, sw_f)
    d.text((W - 64 - tw, H - 55), txt, font=sw_f, fill=DARK)

    return img.convert("RGB")


def slide_three() -> Image.Image:
    img = gradient_bg().convert("RGBA")
    d = ImageDraw.Draw(img)

    # FLOW STATE lockup top
    lock = flow_state_inline(text_size_px=56, color=(26, 26, 46, 230))
    img.alpha_composite(lock, (64, 60))

    # Subtle UI fragments
    it = itinerary_card(scale=0.5)
    alpha = it.split()[-1].point(lambda v: int(v * 0.45))
    it.putalpha(alpha)
    paste_rotated(img, it, (W - 180, 320), 9)

    cd = countdown_card(scale=0.42)
    alpha = cd.split()[-1].point(lambda v: int(v * 0.5))
    cd.putalpha(alpha)
    paste_rotated(img, cd, (180, 1010), -8)

    # Big main line block
    main_f = dela(90)
    sub_f = dela(52)

    x = 64
    y = 200
    d.text((x, y), "built bit", font=main_f, fill=DARK)
    y += 102
    d.text((x, y), "by bit over", font=main_f, fill=DARK)
    y += 102
    d.text((x, y), "a month.", font=main_f, fill=CORAL_DEEP)
    y += 130

    d.text((x, y), "in little bursts,", font=sub_f, fill=DARK)
    y += 64
    d.text((x, y), "with AI helping", font=sub_f, fill=DARK)
    y += 64
    sub_line = "me ship"
    d.text((x, y), sub_line, font=sub_f, fill=DARK)
    sw, sh = text_size(d, sub_line, sub_f)
    draw_emoji(img, (x + sw + 16, y), "🚀", 56)

    # CTA card bottom — sized to fit cleanly inside the slide
    cta_w = W - 128
    cta_h = 200
    cta_x = 64
    cta_y = H - 250
    cta_card = Image.new("RGBA", (cta_w, cta_h), (0, 0, 0, 0))
    ImageDraw.Draw(cta_card).rounded_rectangle(
        (0, 0, cta_w, cta_h), 30, fill=(26, 26, 46, 248),
    )
    cta_shadowed = with_shadow(cta_card, blur=40, offset=(0, 20), opacity=140)
    img.alpha_composite(cta_shadowed,
                        (cta_x - (cta_shadowed.width - cta_w) // 2,
                         cta_y - (cta_shadowed.height - cta_h) // 2))

    cd2 = ImageDraw.Draw(img)
    drop_f = dela(54)
    line = "drop a"
    cd2.text((cta_x + 32, cta_y + 32), line, font=drop_f, fill=YELLOW)
    lw, lh = text_size(cd2, line, drop_f)
    # robot emoji baseline-aligned with the text
    draw_emoji(img, (cta_x + 32 + lw + 16, cta_y + 28), "🤖", 60)
    cd2.text((cta_x + 32, cta_y + 110),
             "if you want me to share how", font=nunito(26, 800),
             fill=(255, 255, 255, 235))

    chip = small_chip("ai · nights · weekends", CORAL, WHITE, scale=0.85)
    img.alpha_composite(chip,
                        (cta_x + cta_w - chip.width - 28,
                         cta_y + cta_h - chip.height - 26))

    pm = nunito(22, 900)
    d.text((64, H - 40), "3 / 3", font=pm, fill=(255, 255, 255, 235))

    return img.convert("RGB")


def main():
    outputs = []
    for i, fn in enumerate([slide_one, slide_two, slide_three], start=1):
        path = os.path.join(HERE, f"slide-{i}.png")
        slide = fn()
        slide.save(path, "PNG", optimize=True)
        outputs.append(path)
        print(f"wrote {path}")

    pdf_path = os.path.join(HERE, "carousel.pdf")
    images = [Image.open(p).convert("RGB") for p in outputs]
    images[0].save(pdf_path, save_all=True, append_images=images[1:], format="PDF")
    print(f"wrote {pdf_path}")


if __name__ == "__main__":
    main()
