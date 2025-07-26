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
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

load_dotenv("../.env", verbose=True)

HOST = os.getenv("WHISPER_HOST")
PORT = int(os.getenv("WHISPER_PORT"))
MODEL_NAME = os.getenv("WHISPER_MODEL_NAME")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE")
DEVICE = os.getenv("WHISPER_DEVICE")
PASSWORD = os.getenv("WHISPER_PASSWORD")
SHUTDOWN_TIMEOUT = int(os.getenv("WHISPER_SHUTDOWN_TIMEOUT", "-1"))

@asynccontextmanager
async def lifespan(app):
  async def auto_task(timeout_seconds: int = 60):
    while True:
      await asyncio.sleep(5)

      if whisper.model and lock.is_idle_for(timeout_seconds):
        print("Unloading model from memory")
        await whisper.unload()

      if SHUTDOWN_TIMEOUT != -1 and lock.is_idle_for(SHUTDOWN_TIMEOUT):
        print("No activity for a while, shutting down server")
        signal.raise_signal(signal.SIGINT)

  asyncio.create_task(auto_task())
  yield

class MyLock(asyncio.Lock):
  def __init__(self):
    super().__init__()
    self.mtime = datetime.now()

  async def acquire(self, *args, **kwargs):
    self.mtime = datetime.now()
    await super().acquire(*args, **kwargs)
    self.mtime = datetime.now()

  async def release(self, *args, **kwargs):
    self.mtime = datetime.now()
    await super().release(*args, **kwargs)
    self.mtime = datetime.now()

  def is_idle_for(self, seconds: int) -> bool:
    return (not self.locked()) and (datetime.now() - self.mtime) > timedelta(seconds=seconds)

app = FastAPI(lifespan=lifespan)
whisper = Whisper(model_name=MODEL_NAME, compute_type=COMPUTE_TYPE, device=DEVICE)
lock = MyLock()
security = HTTPBasic()

def basic_auth(credentials: HTTPBasicCredentials = Depends(security)):
  if PASSWORD is None:
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Auth password not set")
  correct_password = secrets.compare_digest(credentials.password, PASSWORD)
  if not correct_password:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect password",
        headers={"WWW-Authenticate": "Basic"},
    )

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
async def transcribe_audio(req: Request, body: TranscribeRequest, _auth=Depends(basic_auth)):
  async def event_stream():
    try:
      async with lock:
        async for event in whisper.transcribe(req, body.audio_path, body.language):
          yield {"data": json.dumps(event, default=to_plain)}
          await asyncio.sleep(0)  # Yield control to the event loop
    except Exception as e:
      formatted = format_exception(e)
      print(f"Error during transcription: {formatted}")
      yield {"data": json.dumps({"type": "error", "error": formatted}, default=to_plain)}

  return EventSourceResponse(event_stream())

class TranscribeUploadRequest(BaseModel):
  language: str | None = None

@app.post("/transcribe-upload")
async def transcribe_audio_upload(req: Request, audio: UploadFile = File(...), language: str = Form(None), _auth=Depends(basic_auth)):
  if language == "": language = None

  async def event_stream():
    try:
      async with lock:
        audio_buffer = BytesIO(content)
        async for event in whisper.transcribe(req, audio_buffer, language):
          yield {"data": json.dumps(event, default=to_plain)}
          await asyncio.sleep(0)

    except Exception as e:
      formatted = format_exception(e)
      print(f"Error during transcription: {formatted}")
      yield {"data": json.dumps({"type": "error", "error": formatted}, default=to_plain)}

  content = await audio.read()
  return EventSourceResponse(event_stream())

class HealthCheckResponse(BaseModel):
  status: str
  model_name: str
  compute_type: str
  device: str
  model_loaded: bool

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
  return {
      "status": "ok",
      "model_name": whisper.model_name,
      "compute_type": whisper.compute_type,
      "device": whisper.device,
      "model_loaded": whisper.model is not None,
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
