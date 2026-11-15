#!/usr/bin/env bash
# Recreates the REQUIRED video-editing folder structure. Safe to run any time.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/video-editing"
mkdir -p "$ROOT"/{01_downloads,02_raw_footage,03_audio,04_transcripts,05_projects,06_assets/{music,sfx,images,fonts,overlays},07_exports,08_thumbnails,tmp}
for d in "$ROOT"/*/ "$ROOT"/06_assets/*/; do [ -z "$(ls -A "$d")" ] && touch "$d/.gitkeep"; done
echo "Video folders ready at $ROOT"
