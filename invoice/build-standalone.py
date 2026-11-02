#!/usr/bin/env python3
"""
Build invoice/standalone.html: the portal as one self-contained file.

index.html points at ../assets/*.png, which only works when the whole repo is
there. This inlines those images (downscaled to what the page actually renders)
so the result can be dropped onto any host, in any folder, on its own.

    python3 invoice/build-standalone.py
"""
import base64, io, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "invoice" / "index.html"
OUT = ROOT / "invoice" / "standalone.html"

# Rendered size -> embed at roughly 3x for retina, not the full original.
ASSETS = {
    "../assets/grr-logo-light.png": 170,   # ~54px tall on screen and on paper
    "../assets/signature.png": 520,        # 172px wide on the invoice
}


def data_uri(path: pathlib.Path, target_w: int) -> str:
    try:
        from PIL import Image
    except ImportError:
        sys.exit("This needs Pillow:  pip install Pillow")
    im = Image.open(path).convert("RGBA")
    if im.width > target_w:
        im = im.resize((target_w, max(1, round(im.height * target_w / im.width))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    for rel, width in ASSETS.items():
        path = (ROOT / "invoice" / rel).resolve()
        if not path.exists():
            sys.exit("missing asset: " + str(path))
        uri = data_uri(path, width)
        before = html.count(rel)
        html = html.replace(rel, uri)
        print("inlined %-34s %4d px  %6.1f KB  (%d references)"
              % (path.name, width, len(uri) / 1024, before))

    note = ("<!-- Built by invoice/build-standalone.py from invoice/index.html.\n"
            "     Images are inlined, so this file works on its own, in any folder,\n"
            "     on any host. Edit index.html and re-run the script, not this file. -->\n")
    html = html.replace("<!doctype html>", "<!doctype html>\n" + note, 1)

    OUT.write_text(html, encoding="utf-8")
    print("\nwrote %s  (%.1f KB)" % (OUT.relative_to(ROOT), OUT.stat().st_size / 1024))
    leftovers = re.findall(r'(?:src|href)="(?!data:|https:|#)([^"]+)"', html)
    print("remaining external file references:", leftovers or "none")


if __name__ == "__main__":
    main()
