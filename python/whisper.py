from io import BytesIO
from fastapi import Request
from faster_whisper import WhisperModel

import os
from datetime import datetime

class Whisper:
  def __init__(self, model_name, compute_type, device):
    self.model_name = model_name
    self.compute_type = compute_type
    self.device = device
    self.model: WhisperModel = None

  async def load(self):
    if self.model is None:
      self.model = WhisperModel(self.model_name, compute_type=self.compute_type, device=self.device)

  async def unload(self):
    self.model = None

  async def transcribe(self, req: Request, audio_path: str | BytesIO, language: str = None):
    await self.load()
    if isinstance(audio_path, str) and not os.path.exists(audio_path):
      yield {"type": "error", "error": f"Audio file not found: {audio_path}"}
      return

    yield {"type": "status", "message": "Starting transcription", "progress": 2}

    segments_iter, info = self.model.transcribe(
        audio_path, language=language, word_timestamps=True, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500))

    yield {"type": "info", "language": info.language, "duration": info.duration}

    whisper_words = []
    whisper_segments = []
    processed_duration = 0.0

    yield {"type": "status", "message": "Processing segments", "progress": 4}

    for i, segment in enumerate(segments_iter):
      segment_words = [{"word": word.word.strip(), "start": word.start, "end": word.end} for word in segment.words]
      segment_data = {
          "id": i,
          "seek": segment.seek,
          "start": segment.start,
          "end": segment.end,
          "text": segment.text.strip(),
          "temperature": segment.temperature,
          "avg_logprob": segment.avg_logprob,
          "compression_ratio": segment.compression_ratio,
          "no_speech_prob": segment.no_speech_prob,
      }

      whisper_words.extend(segment_words)
      whisper_segments.append(segment_data)

      processed_duration = segment.end
      progress = min(5 + (processed_duration / info.duration) * 94, 99)  # 5-99% range

      delta = {
          "words": segment_words,
          "segment": segment_data,
      }

      yield {"type": "progress", "progress": progress, "processed_duration": processed_duration}
      yield {"type": "delta", "data": delta}

      if await req.is_disconnected():
        yield {"type": "error", "error": "Client disconnected"}
        return

    result = {
        "task": "transcribe",
        "language": info.language,
        "duration": info.duration,
        "text": " ".join(segment["text"].strip() for segment in whisper_segments),
        "words": whisper_words,
        "segments": whisper_segments,
    }

    yield {"type": "status", "message": "Done", "progress": 100}
    yield {"type": "result", "data": result}
