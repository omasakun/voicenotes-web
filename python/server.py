import asyncio
import dataclasses
import json
import os
import signal
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import click
import numpy as np
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
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

class ProcessRequest(BaseModel):
  audio_path: str
  language: str = None

def to_plain(obj):
  if dataclasses.is_dataclass(obj):
    return dataclasses.asdict(obj)
  if isinstance(obj, np.ndarray):
    return obj.tolist()
  if isinstance(obj, (np.generic,)):
    return obj.item()
  return str(obj)

@app.post("/process")
async def process_audio(req: Request, body: ProcessRequest):
  async def event_stream():
    try:
      async for event in whisper.transcribe(req, body.audio_path, body.language):
        yield {"data": json.dumps(event, default=to_plain)}
        await asyncio.sleep(0)  # Yield control to the event loop
    except Exception as e:
      print(f"Error during transcription: {e}")

  async with lock:
    return EventSourceResponse(event_stream())

@app.get("/health")
async def health_check():
  return {
      "status": "ok",
      "model_name": whisper.model_name,
      "compute_type": whisper.compute_type,
      "device": whisper.device,
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
