import type { AudioRecording } from "@monorepo/prisma-client";
import { AppWrapper } from "@/components/app-wrapper";
import { LiveRecordingPlayer, RecordingPlayer } from "./recording-player";

export default function RecordingPage({ recording }: { recording: AudioRecording }) {
  const isProcessing = recording.status === "PROCESSING" || recording.status === "PENDING";

  return (
    <AppWrapper>
      <div className="container mx-auto px-4 py-8">
        {isProcessing ? <LiveRecordingPlayer recording={recording} /> : <RecordingPlayer recording={recording} />}
      </div>
    </AppWrapper>
  );
}
