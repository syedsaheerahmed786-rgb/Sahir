#!/usr/bin/env bash
# Reinstalls the video toolchain in a fresh container.
set -euo pipefail
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y ffmpeg; }
python3 -m venv /opt/video-venv
/opt/video-venv/bin/pip install -q --upgrade pip yt-dlp openai-whisper
npm install -g hyperframes
ln -sf /opt/video-venv/bin/yt-dlp /usr/local/bin/yt-dlp
ln -sf /opt/video-venv/bin/whisper /usr/local/bin/whisper
"$(dirname "$0")/setup-video-folders.sh"
echo "Done. Verify: ffmpeg -version; yt-dlp --version; whisper --help; hyperframes doctor"
