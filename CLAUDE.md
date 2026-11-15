# Video Editing Rules (REQUIRED — remember every session)

## Required folder structure
All video work MUST live inside `video-editing/` using these folders. Never put media
loose in the repo root. If a folder is missing, run `scripts/setup-video-folders.sh` first.

| Folder | Purpose |
|---|---|
| `video-editing/01_downloads/` | yt-dlp downloads (original, untouched) |
| `video-editing/02_raw_footage/` | Source clips the user supplies; never modify originals |
| `video-editing/03_audio/` | Extracted / cleaned audio (wav, mp3) |
| `video-editing/04_transcripts/` | Whisper output (.txt .srt .vtt .json) |
| `video-editing/05_projects/` | One subfolder per project (Hyperframes comps, edit scripts) |
| `video-editing/06_assets/{music,sfx,images,fonts,overlays}/` | Reusable assets |
| `video-editing/07_exports/` | FINAL rendered videos only |
| `video-editing/08_thumbnails/` | Thumbnails and stills |
| `video-editing/tmp/` | Scratch / intermediates — safe to delete |

Rules:
- Downloads go to `01_downloads`, then work on COPIES — never edit originals in place.
- Transcripts go to `04_transcripts`, named after the source file.
- Finished renders go only to `07_exports`, named `<project>_<YYYYMMDD>_v<N>.mp4`.
- Media files are git-ignored (see `.gitignore`); folder skeleton is tracked via `.gitkeep`.

## Installed tools
- **FFmpeg / ffprobe** — system (`ffmpeg`, `ffprobe`)
- **yt-dlp**, **openai-whisper** — in venv `/opt/video-venv` (use `/opt/video-venv/bin/yt-dlp`, `/opt/video-venv/bin/whisper`)
- **Hyperframes** (HeyGen, HTML -> MP4) — global npm CLI `hyperframes` (`hyperframes doctor` to check)

## Quick commands
```bash
yt-dlp -P video-editing/01_downloads "<url>"
whisper video-editing/03_audio/x.wav --model small --output_dir video-editing/04_transcripts
hyperframes init video-editing/05_projects/<name>
hyperframes render   # run inside the project; output -> video-editing/07_exports/
```

## Environment note
Cloud container is ephemeral: tools installed outside the repo (venv, npm global) are lost
when the container is reclaimed. Re-run `scripts/install-video-tools.sh` in a new session.
