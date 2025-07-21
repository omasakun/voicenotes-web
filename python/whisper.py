from fastapi import Request
from faster_whisper import WhisperModel

import os
from datetime import datetime

class Whisper:
  def __init__(self, model_name, compute_type, device):
    self.model_name = model_name
    self.compute_type = compute_type
    self.device = device
    self.model = None
    self.last_access_time = datetime.now()

  async def load(self):
    if self.model is None:
      self.model = WhisperModel(self.model_name, compute_type=self.compute_type, device=self.device)
    self.last_access_time = datetime.now()

  async def unload(self):
    self.model = None

  async def transcribe(self, req: Request, audio_path: str, language: str = None):
    await self.load()
    self.last_access_time = datetime.now()
    if not os.path.exists(audio_path):
      yield {"type": "error", "error": f"Audio file not found: {audio_path}"}
      return

    yield {"type": "status", "message": "Starting transcription", "progress": 5}

    segments_iter, info = self.model.transcribe(
        audio_path, language=language, word_timestamps=True, vad_filter=True, vad_parameters=dict(min_silence_duration_ms=500))

    yield {"type": "info", "language": info.language, "duration": info.duration}

    segments_list = []
    words = []
    processed_duration = 0.0

    yield {"type": "status", "message": "Processing segments", "progress": 10}

    for segment in segments_iter:
      segments_list.append(segment)
      processed_duration = segment.end
      progress = min(10 + (processed_duration / info.duration) * 80, 90)  # 10-90% range
      yield {"type": "progress", "progress": progress, "processed_duration": processed_duration}
      if hasattr(segment, 'words') and segment.words:
        for word in segment.words:
          words.append({"word": word.word.strip(), "start": word.start, "end": word.end})

      if await req.is_disconnected():
        yield {"type": "error", "error": "Client disconnected"}
        return

    yield {"type": "status", "message": "Formatting results", "progress": 90}

    whisper_segments = []
    for i, segment in enumerate(segments_list):
      whisper_segments.append({
          "id": i,
          "seek": int(segment.start * 100),
          "start": segment.start,
          "end": segment.end,
          "text": segment.text.strip(),
          "tokens": [],
          "temperature": 0.0,
          "avg_logprob": getattr(segment, 'avg_logprob', -0.5),
          "compression_ratio": getattr(segment, 'compression_ratio', 2.0),
          "no_speech_prob": getattr(segment, 'no_speech_prob', 0.0)
      })

    full_text = " ".join(segment.text.strip() for segment in segments_list)

    result = {"task": "transcribe", "language": info.language, "duration": info.duration, "text": full_text, "words": words, "segments": whisper_segments}

    yield {"type": "status", "message": "Done", "progress": 100}
    yield {"type": "result", "data": result}
