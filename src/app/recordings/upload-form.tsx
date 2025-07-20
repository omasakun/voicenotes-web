"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
// Helper for posting with progress
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatFileSize, postWithProgress } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export function UploadForm() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="audio-file">Audio File</Label>
        <Input
          id="audio-file"
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={uploading}
          className="cursor-pointer"
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected: {file.name} ({formatFileSize(file.size)})
          </p>
        )}
      </div>

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
          <p className="text-sm text-muted-foreground">{uploadProgress}% uploaded</p>
        </div>
      )}

      <Button type="submit" disabled={!file || uploading} className="w-full">
        {uploading ? "Uploading..." : "Upload Recording"}
      </Button>
    </form>
  );
}
