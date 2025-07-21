"use client";

import type { AudioRecording } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Download, Edit2, Pause, Play, RotateCcw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useIntersection } from "react-use";
import { toast } from "sonner";
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

interface RecordingPlayerProps {
  recording: AudioRecording;
}

export function RecordingPlayer({ recording }: RecordingPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  // Use intersection observer to detect when the main player is out of view
  const intersection = useIntersection(playerRef, {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  });

  const showStickyPlayer = intersection && !intersection.isIntersecting;

  const handleSeek = (time: number) => {
    setSeekTime(time);
  };

  return (
    <div className="space-y-6">
      {/* Sticky Player - shown when scrolling */}
      {showStickyPlayer && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
          <div className="container mx-auto px-4 py-2">
            <AudioPlayer
              src={`/api/audio/${recording.id}`}
              duration={recording.duration}
              onTimeUpdate={setCurrentTime}
              seekTime={seekTime}
              onSeekComplete={() => setSeekTime(null)}
              compact={true}
            />
          </div>
        </div>
      )}

      <RecordingPlayerHeader recording={recording} />
      <Card ref={playerRef}>
        <CardHeader>
          <RecordingInfo recording={recording} />
        </CardHeader>
        <CardContent className="space-y-4">
          <AudioPlayer
            src={`/api/audio/${recording.id}`}
            duration={recording.duration}
            onTimeUpdate={setCurrentTime}
            seekTime={seekTime}
            onSeekComplete={() => setSeekTime(null)}
            compact={false}
          />
          {recording.status === "PROCESSING" && <TranscriptionProgress progress={recording.transcriptionProgress} />}
          {recording.status === "FAILED" && <TranscriptionError error={recording.transcriptionError} />}
        </CardContent>
      </Card>
      {recording.transcription && (
        <InteractiveTranscription
          transcription={recording.transcription}
          whisperData={recording.whisperData}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      )}
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
        <a href={`/api/audio/${recording.id}`} download={recording.originalName}>
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

function AudioPlayer({
  src,
  duration: initialDuration,
  onTimeUpdate,
  seekTime,
  onSeekComplete,
  compact = false,
}: {
  src: string;
  duration: number | null;
  onTimeUpdate: (time: number) => void;
  seekTime: number | null;
  onSeekComplete: () => void;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdate(time);
    };
    const updateDuration = () => Number.isFinite(audio.duration) && setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onTimeUpdate]);

  // Handle seeking from external source
  useEffect(() => {
    const audio = audioRef.current;
    if (seekTime !== null && audio) {
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
      onSeekComplete();

      audio.play();
      setIsPlaying(true);
    }
  }, [seekTime, onSeekComplete]);

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
    onTimeUpdate(value);
  };

  const resetAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    onTimeUpdate(0);
    setIsPlaying(false);
    audio.pause();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <audio
          ref={audioRef}
          src={src}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
            }
          }}
        />
        <Button onClick={togglePlay} size="sm">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={resetAudio}>
          <RotateCcw className="h-3 w-3" />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-muted-foreground min-w-[3rem]">{formatPlaybackTime(currentTime)}</span>
          <Slider
            min={0}
            max={duration || 0}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground min-w-[3rem]">{formatPlaybackTime(duration)}</span>
        </div>
      </div>
    );
  }

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
