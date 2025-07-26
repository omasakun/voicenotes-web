"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatFileSize, postWithProgress } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { AudioRecorder } from "./audio-recorder";

export function UploadForm() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleRecordingComplete = (recordedFile: File, recordedTitle: string) => {
    setFile(recordedFile);
    setTitle(recordedTitle);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Set default title from filename
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select an audio file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      if (title) {
        formData.append("title", title);
      }

      const response = await postWithProgress({
        url: "/api/audio/upload",
        body: formData,
        onProgress: (percent) => setUploadProgress(percent * 0.9),
      });

      if (!response.ok) {
        toast.error("Upload failed");
        return;
      }

      toast.success("Audio uploaded successfully! Transcription will start shortly.");

      // Reset form
      setFile(null);
      setTitle("");
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh the recordings list
      queryClient.invalidateQueries({ queryKey: trpc.recordings.list.infiniteQueryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.recordings.listAll.queryKey() });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={uploading} />
        </div>

        <div className="flex-1 space-y-4">
          <Label htmlFor="audio-file">Or Upload Audio File</Label>
          <div className="flex items-center space-x-2">
            <Button asChild className="cursor-pointer" disabled={uploading}>
              <label htmlFor="audio-file">{uploading ? "Uploading..." : "Select File"}</label>
            </Button>
            <Input
              id="audio-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={uploading}
              className="hidden"
            />
            {file && (
              <p className="text-muted-foreground text-sm">
                {file.name} ({formatFileSize(file.size)})
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for your recording"
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <Label>Upload Progress</Label>
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-muted-foreground text-sm">{uploadProgress.toFixed(2)}% uploaded</p>
        </div>
      )}

      <Button type="submit" disabled={!file || uploading} className="w-full">
        {uploading ? "Uploading..." : "Upload Recording"}
      </Button>
    </form>
  );
}
