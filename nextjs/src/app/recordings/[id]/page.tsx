import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LiveRecordingPlayer, RecordingPlayer } from "./recording-player";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecordingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return redirect("/signin");
  }

  const recording = await prisma.audioRecording.findFirst({
    where: {
      id: id,
      userId: session.user.id,
    },
  });

  if (!recording) {
    return notFound();
  }

  const isProcessing = recording.status === "PROCESSING" || recording.status === "PENDING";

  return (
    <div className="container mx-auto py-8 px-4">
      {isProcessing ? <LiveRecordingPlayer recording={recording} /> : <RecordingPlayer recording={recording} />}
    </div>
  );
}
