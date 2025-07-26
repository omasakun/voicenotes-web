import { AppWrapper } from "@/components/app-wrapper";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingsList } from "./recordings-list";
import { UploadForm } from "./upload-form";

export default function RecordingsPage() {
  return (
    <AppWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <PageHeader title="Voice Notes" description="Upload and transcribe your audio recordings" />
          <UploadRecordingCard />
          <RecordingsListCard />
        </div>
      </div>
    </AppWrapper>
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
