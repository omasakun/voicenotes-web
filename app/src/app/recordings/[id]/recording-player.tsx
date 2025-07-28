"use client";

import type { AudioRecording } from "@monorepo/prisma-client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Edit2, Pause, Play, RotateCcw, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useIntersectionObserver } from "usehooks-ts";
import { useDebouncedCallback } from "use-debounce";
import { InteractiveTranscription } from "@/app/recordings/[id]/interactive-transcription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { formatDate, formatFileSize, formatPlaybackTime, getStatusColor, getStatusText } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { type Player, usePlayer } from "./use-audio-player";

interface RecordingPlayerProps {
  recording: AudioRecording;
}

export function LiveRecordingPlayer({ recording: initialRecording }: RecordingPlayerProps) {
  const trpc = useTRPC();
  const id = initialRecording.id;

  const { data: recording, refetch } = useQuery(
    trpc.recordings.get.queryOptions({ id }, { initialData: initialRecording }),
  );

  // Poll for updates if recording is processing
  useEffect(() => {
    if (recording?.status !== "PROCESSING" && recording?.status !== "PENDING") return;

    const timer = setInterval(() => refetch(), 2000);

    return () => clearInterval(timer);
  }, [recording?.status, refetch]);

  return <RecordingPlayer recording={recording} />;
}

export function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const audioPlayer = usePlayer({
    src: `/api/audio/${recording.id}`,
    initialDuration: recording.duration,
  });

  const [playerRef, isIntersecting, observer] = useIntersectionObserver({
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  });

  const showStickyPlayer = observer && !isIntersecting;

  const handleSeek = useCallback(
    (time: number) => {
      audioPlayer.seek(time);
      audioPlayer.play();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audioPlayer.seek, audioPlayer.play],
  );

  return (
    <div className="space-y-6">
      {showStickyPlayer && (
        <div className="fixed left-0 right-0 top-0 z-50 border-b bg-white/95 shadow-sm backdrop-blur-sm">
          <div className="container mx-auto px-4 py-2">
            <AudioPlayer audioPlayer={audioPlayer} compact={true} />
          </div>
        </div>
      )}

      <RecordingPlayerHeader recording={recording} />
      <Card ref={playerRef}>
        <CardHeader>
          <RecordingInfo recording={recording} />
        </CardHeader>
        <CardContent className="space-y-4">
          <AudioPlayer audioPlayer={audioPlayer} compact={false} />
          {recording.status === "PROCESSING" && <TranscriptionProgress progress={recording.transcriptionProgress} />}
          {recording.status === "FAILED" && <TranscriptionError error={recording.transcriptionError} />}
        </CardContent>
      </Card>
      {recording.transcription && (
        <InteractiveTranscription
          transcription={recording.transcription}
          whisperData={recording.whisperData}
          status={recording.status}
          currentTime={audioPlayer.currentTime}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
}

function RecordingPlayerHeader({ recording }: { recording: AudioRecording }) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={() => window.history.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Recordings
      </Button>
      <Button variant="outline" asChild>
        <a href={`/api/audio/${recording.id}`} download={recording.originalName}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </a>
      </Button>
    </div>
  );
}

function RecordingInfo({ recording }: { recording: AudioRecording }) {
  const trpc = useTRPC();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(recording.title || "");

  const updateTitle = useMutation(
    trpc.recordings.updateTitle.mutationOptions({
      onSuccess: () => {
        toast.success("Title updated");
        setIsEditingTitle(false);
        window.location.reload();
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
      <div className="flex-1 space-y-2">
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

type AudioPlayerProps = {
  audioPlayer: Player;
  compact?: boolean;
};

function AudioPlayer({ audioPlayer, compact = false }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, togglePlay, reset, seek } = audioPlayer;
  const [sliderValue, setSliderValue] = useState(currentTime);

  const debouncedSeek = useDebouncedCallback(seek, 100);

  const handleSeek = useCallback(
    ([value]: [number]) => {
      setSliderValue(value);
      debouncedSeek(value);
    },
    [debouncedSeek],
  );

  useEffect(() => {
    if (!debouncedSeek.isPending()) {
      setSliderValue(currentTime);
    }
  }, [debouncedSeek, currentTime]);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={togglePlay} size="sm">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-3 w-3" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <span className="text-muted-foreground min-w-[3rem] text-sm">{formatPlaybackTime(sliderValue)}</span>
          <Slider
            min={0}
            max={duration || 0}
            step={0.1}
            value={[sliderValue]}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-muted-foreground min-w-[3rem] text-sm">{formatPlaybackTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button onClick={togglePlay} size="lg">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-2">
          <Slider
            min={0}
            max={duration || 0}
            step={0.1}
            value={[sliderValue]}
            onValueChange={handleSeek}
            className="w-full"
          />
          <div className="text-muted-foreground flex justify-between text-sm">
            <span>{formatPlaybackTime(sliderValue)}</span>
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
      <p className="text-muted-foreground text-sm">{progress.toFixed(2)}% complete</p>
    </div>
  );
}

function TranscriptionError({ error }: { error: string | null }) {
  return (
    <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="font-bold">Transcription Error</div>
      <p>{error || "An unknown error occurred"}</p>
    </div>
  );
}
