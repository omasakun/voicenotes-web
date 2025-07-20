"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, Edit2, Pause, Play, RotateCcw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatFileSize, formatPlaybackTime, getStatusColor, getStatusText } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { AudioRecording } from "@prisma/client";
import { Slider } from "@/components/ui/slider";

interface RecordingPlayerProps {
  recording: AudioRecording;
}

export function RecordingPlayer({ recording }: RecordingPlayerProps) {
  return (
    <div className="space-y-6">
      <RecordingPlayerHeader recording={recording} />
      <Card>
        <CardHeader>
          <RecordingInfo recording={recording} />
        </CardHeader>
        <CardContent className="space-y-4">
          <AudioPlayer src={`/api/audio/${recording.id}`} duration={recording.duration} />
          {recording.status === "PROCESSING" && <TranscriptionProgress progress={recording.transcriptionProgress} />}
          {recording.status === "FAILED" && <TranscriptionError error={recording.transcriptionError} />}
        </CardContent>
      </Card>
      {recording.transcription && <TranscriptionCard transcription={recording.transcription} />}
    </div>
  );
}

function RecordingPlayerHeader({ recording }: { recording: AudioRecording }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Recordings
      </Button>
      <Button variant="outline" asChild>
        <a href={`/api/audio/${recording.id}`} download>
          <Download className="h-4 w-4 mr-2" />
          Download
        </a>
      </Button>
    </div>
  );
}

function RecordingInfo({ recording }: { recording: AudioRecording }) {
  const router = useRouter();
  const trpc = useTRPC();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(recording.title || "");

  const updateTitle = useMutation(
    trpc.recordings.updateTitle.mutationOptions({
      onSuccess: () => {
        toast.success("Title updated");
        setIsEditingTitle(false);
        router.refresh();
      },
      onError: (error: any) => {
        toast.error(error.message);
      },
    }),
  );

  const handleSaveTitle = () => {
    if (newTitle.trim() && newTitle !== recording.title) {
      updateTitle.mutate({
        id: recording.id,
        title: newTitle.trim(),
      });
    } else {
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              className="text-lg font-semibold"
            />
            <Button size="sm" onClick={handleSaveTitle} disabled={updateTitle.isPending}>
              <Save className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditingTitle(false);
                setNewTitle(recording.title || "");
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl">{recording.title}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(true)}>
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        )}
        <CardDescription className="flex items-center gap-2">
          Original file: {recording.originalName}
          <Separator orientation="vertical" className="h-3" />
          {formatFileSize(recording.fileSize)}
          <Separator orientation="vertical" className="h-3" />
          {formatDate(new Date(recording.createdAt))}
        </CardDescription>
      </div>
      <Badge className={getStatusColor(recording.status)}>{getStatusText(recording.status)}</Badge>
    </div>
  );
}

function AudioPlayer({ src, duration: initialDuration }: { src: string; duration: number | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = ([value]: [number]) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value;
    setCurrentTime(value);
  };

  const resetAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    audio.pause();
  };

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
      />
      <div className="flex items-center gap-4">
        <Button onClick={togglePlay} size="lg">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="outline" onClick={resetAudio}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-2">
          <Slider
            min={0}
            max={duration || 0}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatPlaybackTime(currentTime)}</span>
            <span>{formatPlaybackTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TranscriptionProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <Label>Transcription Progress</Label>
      <Progress value={progress} className="w-full" />
      <p className="text-sm text-muted-foreground">{progress}% complete</p>
    </div>
  );
}

function TranscriptionError({ error }: { error: string | null }) {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg text-sm text-red-800 space-y-2">
      <div className="font-bold">Transcription Error</div>
      <p>{error || "An unknown error occurred"}</p>
    </div>
  );
}

function TranscriptionCard({ transcription }: { transcription: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcription</CardTitle>
        <CardDescription>Automatically generated transcript of your audio recording</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcription}</p>
        </div>
      </CardContent>
    </Card>
  );
}
