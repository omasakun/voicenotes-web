# syntax=docker/dockerfile:1-labs

# https://cloud.google.com/run/docs/configuring/services/gpu#gpu-type
# NVIDIA driver version: 535.216.03 (CUDA 12.2)
FROM  nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04

ENV LANG=C.UTF-8
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.8.3 /uv /uvx /bin/

RUN <<EOF
apt-get update
apt-get install -y --no-install-recommends ffmpeg ncdu
apt-get clean
rm -rf /var/lib/apt/lists/*
EOF

RUN <<EOF
uv run --script <<===
# /// script
# dependencies = [
#   "faster-whisper",
# ]
# ///

from faster_whisper import WhisperModel
WhisperModel("large-v3-turbo")

===

uv cache clean
uv python uninstall --all
EOF

COPY --parents uv.lock **/pyproject.toml ./
RUN <<EOF
uv sync --no-dev
uv cache clean
EOF

COPY . .
RUN <<EOF
uv sync --no-dev
uv cache clean
EOF

WORKDIR /app/python
CMD ["uv", "run", "python", "server.py"]
