"use client";

import { ArrowRight, Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatPlaybackTime } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete: (file: File, title: string) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState(0);

  const handleRecordingComplete = (audioBlob: Blob, recordingTime: number) => {
    if (recordedAudio) URL.revokeObjectURL(URL.createObjectURL(recordedAudio));
    setRecordedAudio(audioBlob);
    setEstimatedDuration(recordingTime);
  };

  const deleteRecording = () => {
    if (recordedAudio) URL.revokeObjectURL(URL.createObjectURL(recordedAudio));
    setRecordedAudio(null);
  };

  const useRecordedAudio = () => {
    if (recordedAudio) {
      const file = new File([recordedAudio], `recording-${Date.now()}.webm`, {
        type: "audio/webm",
      });

      const title = `Recording ${new Date().toLocaleString()}`;
      onRecordingComplete(file, title);
      deleteRecording();
    }
  };

  return (
    <div className="space-y-4">
      <Label>Record Audio</Label>
      <div className="flex flex-col space-y-3">
        {!recordedAudio && <AudioRecorderControls onRecordingComplete={handleRecordingComplete} disabled={disabled} />}

        {recordedAudio && (
          <AudioPreviewPlayer
            audioBlob={recordedAudio}
            onDelete={deleteRecording}
            estimatedDuration={estimatedDuration}
          />
        )}

        {recordedAudio && (
          <Button type="button" onClick={useRecordedAudio} className="w-full" disabled={disabled}>
            Use This Recording
            <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface AudioRecorderControlsProps {
  onRecordingComplete: (audioBlob: Blob, recordingTime: number) => void;
  disabled?: boolean;
}

export function AudioRecorderControls({ onRecordingComplete, disabled }: AudioRecorderControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordingTime = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        onRecordingComplete(audioBlob, recordingTime);

        // Stop all tracks to turn off microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      startTimeRef.current = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  return (
    <div className="space-y-3">
      {!isRecording && (
        <Button type="button" onClick={startRecording} variant="outline" className="w-full" disabled={disabled}>
          <Mic className="mr-2 h-4 w-4" />
          Start Recording
        </Button>
      )}

      {isRecording && (
        <div className="space-y-3">
          <div className="flex items-center justify-center space-x-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium">Recording: {recordingTime}s</span>
          </div>
          <Button type="button" onClick={stopRecording} variant="outline" className="w-full">
            <Square className="mr-2 h-4 w-4" />
            Stop Recording
          </Button>
        </div>
      )}
    </div>
  );
}

interface AudioPreviewPlayerProps {
  audioBlob: Blob;
  onDelete: () => void;
  estimatedDuration?: number;
}

export function AudioPreviewPlayer({ audioBlob, onDelete, estimatedDuration }: AudioPreviewPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Update audio element when audioBlob changes
  useEffect(() => {
    if (!audioBlob) {
      setAudio(null);
      return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    let playbackTimer: NodeJS.Timeout | null = null;

    const startPlaybackTimer = () => {
      playbackTimer = setInterval(() => {
        if (audio) {
          setCurrentTime(audio.currentTime);

          if (audio.currentTime >= audio.duration) {
            setIsPlaying(false);
            stopPlaybackTimer();
          }
        }
      }, 100);
    };

    const stopPlaybackTimer = () => {
      if (playbackTimer) {
        clearInterval(playbackTimer);
        playbackTimer = null;
      }
    };

    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.onplay = () => {
      setIsPlaying(true);
      startPlaybackTimer();
    };

    audio.onpause = () => {
      setIsPlaying(false);
      stopPlaybackTimer();
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      stopPlaybackTimer();
    };

    setAudio(audio);

    return () => {
      audio.pause();
      audio.src = "";
      setAudio(null);
    };
  }, [audioBlob]);

  const playRecording = () => {
    audio?.play();
  };

  const pauseRecording = () => {
    audio?.pause();
  };

  const seekTo = (value: number[]) => {
    const seekTime = value[0];
    if (audio) {
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const deleteRecording = () => {
    audio?.pause();
    onDelete();
  };

  // workaround for https://issues.chromium.org/issues/40482588
  // TODO: remove the workaround when the issue is resolved
  const theDuration = Number.isFinite(duration) ? duration : estimatedDuration || 0;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Recorded: {formatPlaybackTime(currentTime)}</span>
        <div className="flex space-x-2">
          <Button type="button" onClick={isPlaying ? pauseRecording : playRecording} variant="outline" size="sm">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button type="button" onClick={deleteRecording} variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Slider value={[currentTime]} max={theDuration} step={0.1} onValueChange={seekTo} className="w-full" />
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>{formatPlaybackTime(currentTime)}</span>
          <span>{formatPlaybackTime(theDuration)}</span>
        </div>
      </div>
    </div>
  );
}
