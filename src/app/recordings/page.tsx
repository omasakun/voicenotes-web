import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { RecordingsList } from "./recordings-list";
import { UploadForm } from "./upload-form";

export default async function RecordingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-8">
        <PageHeader title="Voice Notes" description="Upload and transcribe your audio recordings" />
        <UploadRecordingCard />
        <RecordingsListCard />
      </div>
    </div>
  );
}

function UploadRecordingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Recording</CardTitle>
        <CardDescription>Upload an audio file to transcribe.</CardDescription>
      </CardHeader>
      <CardContent>
        <UploadForm />
      </CardContent>
    </Card>
  );
}

function RecordingsListCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Recordings</CardTitle>
        <CardDescription>View and search your uploaded audio recordings</CardDescription>
      </CardHeader>
      <CardContent>
        <RecordingsList />
      </CardContent>
    </Card>
  );
}
