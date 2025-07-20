import json
import click
from pathlib import Path
from typing import Optional, Dict, Any
from faster_whisper import WhisperModel

def transcribe_audio(
    audio_path: str,
    model_size: str,
    language: Optional[str],
    device: str,
    compute_type: str,
) -> Dict[str, Any]:
  try:
    model = WhisperModel(model_size, device=device, compute_type=compute_type)

    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
        vad_filter=True,  # Voice Activity Detection to remove silence
        vad_parameters=dict(min_silence_duration_ms=500))

    segments_list = list(segments)

    words = []
    for segment in segments_list:
      if hasattr(segment, 'words') and segment.words:
        for word in segment.words:
          words.append({"word": word.word.strip(), "start": word.start, "end": word.end})

    whisper_segments = []
    for i, segment in enumerate(segments_list):
      whisper_segments.append({
          "id": i,
          "seek": int(segment.start * 100),  # Convert to centiseconds
          "start": segment.start,
          "end": segment.end,
          "text": segment.text.strip(),
          "tokens": [],  # TODO
          "temperature": 0.0,
          "avg_logprob": segment.avg_logprob if hasattr(segment, 'avg_logprob') else -0.5,
          "compression_ratio": segment.compression_ratio if hasattr(segment, 'compression_ratio') else 2.0,
          "no_speech_prob": segment.no_speech_prob if hasattr(segment, 'no_speech_prob') else 0.0
      })

    full_text = " ".join(segment.text.strip() for segment in segments_list)

    # OpenAI Whisper verbose format
    response = {"task": "transcribe", "language": info.language, "duration": info.duration, "text": full_text, "words": words, "segments": whisper_segments}

    return response

  except Exception as e:
    return {"error": f"Transcription failed: {str(e)}"}

@click.command()
@click.argument("audio_path", type=click.Path(exists=True))
@click.option(
    "--model", default="base", type=click.Choice(["tiny", "base", "small", "medium", "large-v2", "large-v3"]), help="Whisper model size (default: base)")
@click.option("--language", default=None, help="Language code (e.g., 'ja', 'en'). Auto-detect if not specified")
@click.option("--device", default="cpu", type=click.Choice(["cpu", "cuda"]), help="Device to use (default: cpu)")
@click.option("--compute-type", default="int8", type=click.Choice(["int8", "float16", "float32"]), help="Compute type (default: int8)")
@click.option("--output", default=None, type=click.Path(), help="Output file path (JSON format)")
def main(audio_path, model, language, device, compute_type, output):
  """Transcribe audio using faster-whisper"""
  if not Path(audio_path).exists():
    result = {"error": f"Audio file not found: {audio_path}"}
  else:
    result = transcribe_audio(audio_path=audio_path, model_size=model, language=language, device=device, compute_type=compute_type)

  if output:
    with open(output, 'w', encoding='utf-8') as f:
      json.dump(result, f, ensure_ascii=False, indent=2)
  else:
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
  main()
