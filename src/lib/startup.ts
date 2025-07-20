import { initializeTranscriptionQueue } from "./transcription";

let isStarted = false;

export function startup() {
  if (isStarted) return;
  isStarted = true;
  initializeTranscriptionQueue();
}
