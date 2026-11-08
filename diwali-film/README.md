# Diwali Film — "जब तक सब लौट कर नहीं आते"

A 40-second animated Diwali greeting in two cuts — `diwali.mp4` (1920×1080, for
YouTube, WhatsApp and the website) and `diwali-reel.mp4` (1080×1920, for Instagram
Reels, Stories and YouTube Shorts). Both carry an original score. Everything is
generated from code — no stock footage, no sampled music, no licensed assets
beyond the open-source fonts.

## The story

| Time | Beat |
|------|------|
| 0:00 | A village house stays dark while the town celebrates. Someone waits in the doorway. |
| 0:06 | A taper touches a single diya. The frame warms as it catches. |
| 0:14 | The light spreads — diyas along the wall, a rangoli blooming in the courtyard. |
| 0:21 | A traveller walks up the path. The door opens. They hold each other. |
| 0:30 | The house is full of light. **शुभ दीपावली — Happy Diwali.** |

## Files

| File | What it is |
|------|------------|
| `scene.html` | The whole film. A deterministic canvas animation exposing `window.renderFrame(t)`. Loading it with `?reel=1` switches to the vertical composition. |
| `music.py` | The score — santoor-style melody, tanpura drone, pads and distant fireworks, synthesized with numpy. Writes `score.f32`. |
| `render.js` | Drives `scene.html` frame by frame through headless Chromium and pipes PNGs into ffmpeg. |
| `probe.js` | Renders single frames to `probe/` for checking a moment without a full render. |
| `fonts/` | Tiro Devanagari Hindi, Noto Serif Devanagari, Cormorant Garamond (SIL Open Font License). |

## Rebuilding

```bash
python3 music.py          # writes score.f32 (40s, 48kHz stereo) — shared by both cuts
node render.js            # writes diwali.mp4       (1920x1080)
node render.js --reel     # writes diwali-reel.mp4  (1080x1920)
```

```bash
node probe.js 9.5 26.6 35.0        # single frames, landscape
node probe.js --reel 9.5 26.6 35.0 # single frames, vertical
```

Rendering takes roughly six minutes per cut. The animation is a pure function of
time, so any frame can be re-rendered on its own and the result is identical.

## The two formats

The vertical cut is **not** a crop of the wide one. The stage is laid out once in a
fixed 1920×1080 design space (`LY`), and each scene drives a camera over it, so the
two formats are two framings of the same world:

- `REEL` is set from the `?reel=1` query parameter and picks the viewport (`VW`/`VH`).
- Every scene carries its own `z` / `cx` / `cy` for each format — the vertical cut sits
  closer and higher, since a 9:16 window is narrow but tall.
- `FIELD` is how far the camera may roam outside the design frame. The tall crop sees
  sky above and ground below what the wide cut ever shows, so backgrounds fill the
  camera's visible rectangle (`worldRect()`) rather than a fixed 1920×1080 box.
- `LAY` holds the type layout per format, and `fitFont()` shrinks any line that would
  overrun its column — so the Hindi lines stay on one line in both.
- Vertical text sits clear of the Instagram UI: nothing below y≈1250 but the scene.

## Editing

- **Wording** — `LINES` holds the subtitles; `drawFinaleText()` holds the end card.
- **Timing** — `SC` holds the in/out point of each scene; scenes cross-dissolve
  through a short dip to black, set in `post()`.
- **The sign-off** — `drawFinaleText()` renders "MERAKI EVENT / merakievent.in".
- **Music** — `MEL` is the melody as `(time, midi note, level)`; `CH` is the chord bed.

Changing the canvas size means revisiting `LY` (the stage layout), which is laid
out in a fixed 1920×1080 design space.
