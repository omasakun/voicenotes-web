import type { AudioRecording } from "@prisma/client";
import { AppWrapper } from "@/components/app-wrapper";
import { LiveRecordingPlayer, RecordingPlayer } from "./recording-player";

export default function RecordingPage({ recording }: { recording: AudioRecording }) {
  const isProcessing = recording.status === "PROCESSING" || recording.status === "PENDING";

  return (
    <AppWrapper>
      <div className="container mx-auto py-8 px-4">
        {isProcessing ? <LiveRecordingPlayer recording={recording} /> : <RecordingPlayer recording={recording} />}
      </div>
    </AppWrapper>
  );
}
