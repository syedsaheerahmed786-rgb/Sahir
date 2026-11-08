# Diwali Film — "जब तक सब लौट कर नहीं आते"

A 40-second animated Diwali greeting, rendered to `diwali.mp4` (1920×1080, 30 fps,
with an original score). Everything is generated from code — no stock footage,
no sampled music, no licensed assets beyond the open-source fonts.

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
| `scene.html` | The whole film. A deterministic canvas animation exposing `window.renderFrame(t)`. |
| `music.py` | The score — santoor-style melody, tanpura drone, pads and distant fireworks, synthesized with numpy. Writes `score.f32`. |
| `render.js` | Drives `scene.html` frame by frame through headless Chromium and pipes PNGs into ffmpeg. |
| `probe.js` | Renders single frames to `probe/` for checking a moment without a full render. |
| `fonts/` | Tiro Devanagari Hindi, Noto Serif Devanagari, Cormorant Garamond (SIL Open Font License). |

## Rebuilding

```bash
python3 music.py        # writes score.f32 (40s, 48kHz stereo)
node render.js          # writes diwali.mp4
```

```bash
node probe.js 9.5 26.6 35.0
```

Rendering takes roughly four minutes at 1080p30. The animation is a pure function
of time, so any frame can be re-rendered on its own and the result is identical.

## Editing

- **Wording** — `LINES` holds the subtitles; `drawFinaleText()` holds the end card.
- **Timing** — `SC` holds the in/out point of each scene; scenes cross-dissolve
  through a short dip to black, set in `post()`.
- **The sign-off** — `drawFinaleText()` renders "MERAKI EVENT / merakievent.in".
- **Music** — `MEL` is the melody as `(time, midi note, level)`; `CH` is the chord bed.

Changing the canvas size means revisiting `LY` (the stage layout), which is laid
out in a fixed 1920×1080 design space.
