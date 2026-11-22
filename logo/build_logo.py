"""Build the Dhansiri Rani Associates logo as outlined, print-ready SVG."""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

NAVY, GOLD = "#0F2547", "#C59B43"
FONTS = sys.argv[1]


def text_path(fontfile, text, size, tracking_em):
    """Return (svg path d, width, cap-height-ish bounds) for text, baseline at y=0, x from 0."""
    font = TTFont(fontfile)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    s = size / upm
    pen = SVGPathPen(gs)
    bpen = BoundsPen(gs)
    x = 0.0
    chars = list(text)
    for i, ch in enumerate(chars):
        g = cmap[ord(ch)]
        t = (s, 0, 0, -s, x, 0)
        gs[g].draw(TransformPen(pen, t))
        gs[g].draw(TransformPen(bpen, t))
        x += gs[g].width * s
        if i < len(chars) - 1:
            x += tracking_em * size
    xmin, ymin, xmax, ymax = bpen.bounds
    return pen.getCommands(), (xmin, ymin, xmax, ymax)


def placed(d, bounds, cx, baseline, fill):
    xmin, _, xmax, _ = bounds
    dx = cx - (xmin + xmax) / 2
    return f'<path fill="{fill}" transform="translate({dx:.2f} {baseline:.2f})" d="{d}"/>', (xmin + dx, xmax + dx)


def monogram(ox, oy, sc):
    """D + R monogram with a river-wave accent; designed on a 300-unit grid."""
    sw_d, sw_r = 22, 17
    g = [f'<g transform="translate({ox} {oy}) scale({sc})" fill="none" stroke-linejoin="miter" stroke-linecap="butt">']
    # D: stem + semicircular bowl
    g.append(f'<path stroke="{NAVY}" stroke-width="{sw_d}" d="M60 30 H150 A120 120 0 0 1 150 270 H60 Z"/>')
    # R nested inside the D, sharing its geometry
    g.append(f'<path stroke="{NAVY}" stroke-width="{sw_r}" d="M110 206 V74 H156 A32 32 0 0 1 156 138 H110"/>')
    g.append(f'<path stroke="{NAVY}" stroke-width="{sw_r}" d="M148 138 L190 206"/>')
    # Wave accent: white knock-out under a gold flowing line through the base
    wave = "M22 236 C70 214 110 258 155 236 S235 214 282 236"
    g.append(f'<path stroke="#FFFFFF" stroke-width="26" d="{wave}"/>')
    g.append(f'<path stroke="{GOLD}" stroke-width="9" stroke-linecap="round" d="{wave}"/>')
    g.append("</g>")
    return "\n".join(g)


W, H = 1200, 805
cx = W / 2
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         "<title>Dhansiri Rani Associates logo</title>",
         f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
mono_size = 1.3  # 300 * 1.3 = 390
parts.append(monogram(cx - 165 * mono_size, 90, mono_size))

d1, b1 = text_path(f"{FONTS}/Cinzel-700.ttf", "DHANSIRI RANI", 92, 0.06)
p1, _ = placed(d1, b1, cx, 610, NAVY)
parts.append(p1)

d2, b2 = text_path(f"{FONTS}/Montserrat-500.ttf", "ASSOCIATES", 32, 0.5)
p2, (x0, x1) = placed(d2, b2, cx, 690, GOLD)
parts.append(p2)
# Thin gold rules flanking ASSOCIATES
cap = -b2[1]
ry = 690 - cap / 2
parts.append(f'<rect fill="{GOLD}" x="{x0 - 120:.1f}" y="{ry - 1.25:.1f}" width="80" height="2.5"/>')
parts.append(f'<rect fill="{GOLD}" x="{x1 + 40:.1f}" y="{ry - 1.25:.1f}" width="80" height="2.5"/>')
parts.append("</svg>")
print("\n".join(parts))
