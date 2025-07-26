import asyncio
import dataclasses
import json
import os
import signal
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from io import BytesIO

import click
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from utils import format_exception
from whisper import Whisper

load_dotenv("../.env", verbose=True)

HOST = os.getenv("WHISPER_HOST")
PORT = int(os.getenv("WHISPER_PORT"))
MODEL_NAME = os.getenv("WHISPER_MODEL_NAME")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE")
DEVICE = os.getenv("WHISPER_DEVICE")

@asynccontextmanager
async def lifespan(app):
  async def auto_unload(timeout_seconds: int = 60):
    while True:
      await asyncio.sleep(10)
      if whisper.model and (datetime.now() - whisper.last_access_time > timedelta(seconds=timeout_seconds)):
        print("Unloading model from memory")
        await whisper.unload()

  asyncio.create_task(auto_unload())
  yield

app = FastAPI(lifespan=lifespan)
whisper = Whisper(model_name=MODEL_NAME, compute_type=COMPUTE_TYPE, device=DEVICE)
lock = asyncio.Lock()

class TranscribeRequest(BaseModel):
  audio_path: str
  language: str | None = None

def to_plain(obj):
  if dataclasses.is_dataclass(obj):
    return dataclasses.asdict(obj)
  if isinstance(obj, np.ndarray):
    return obj.tolist()
  if isinstance(obj, (np.generic,)):
    return obj.item()
  return str(obj)

@app.post("/transcribe")
async def transcribe_audio(req: Request, body: TranscribeRequest):
  async def event_stream():
    try:
      async for event in whisper.transcribe(req, body.audio_path, body.language):
        yield {"data": json.dumps(event, default=to_plain)}
        await asyncio.sleep(0)  # Yield control to the event loop
    except Exception as e:
      formatted = format_exception(e)
      print(f"Error during transcription: {formatted}")
      yield {"data": json.dumps({"type": "error", "error": formatted}, default=to_plain)}

  async with lock:
    return EventSourceResponse(event_stream())

class TranscribeUploadRequest(BaseModel):
  language: str | None = None

@app.post("/transcribe-upload")
async def transcribe_audio_upload(req: Request, audio: UploadFile = File(...), language: str = Form(None)):
  if language == "": language = None

  async def event_stream():
    try:
      audio_buffer = BytesIO(content)
      async for event in whisper.transcribe(req, audio_buffer, language):
        yield {"data": json.dumps(event, default=to_plain)}
        await asyncio.sleep(0)

    except Exception as e:
      formatted = format_exception(e)
      print(f"Error during transcription: {formatted}")
      yield {"data": json.dumps({"type": "error", "error": formatted}, default=to_plain)}

  async with lock:
    content = await audio.read()
    return EventSourceResponse(event_stream())

class HealthCheckResponse(BaseModel):
  status: str
  model_name: str
  compute_type: str
  device: str
  model_loaded: bool
  last_access: str | None

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
  return {
      "status": "ok",
      "model_name": whisper.model_name,
      "compute_type": whisper.compute_type,
      "device": whisper.device,
      "model_loaded": whisper.model is not None,
      "last_access": whisper.last_access_time.isoformat() if whisper.last_access_time else None,
  }

@click.command()
@click.option('--dev', is_flag=True, default=False, help='Enable live reload (development mode)')
def main(dev: bool) -> None:
  def signal_handler(signum, frame):
    sys.exit(0)

  signal.signal(signal.SIGINT, signal_handler)
  signal.signal(signal.SIGTERM, signal_handler)
  uvicorn.run(
      "server:app",
      host=HOST,
      port=PORT,
      reload=dev,
  )

if __name__ == "__main__":
  main()
