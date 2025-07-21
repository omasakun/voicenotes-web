import { useCallback, useEffect, useRef, useState } from "react";

interface UsePlayerOptions {
  src: string;
  initialDuration?: number | null;
}

export type Player = ReturnType<typeof usePlayer>;
export function usePlayer({ src, initialDuration }: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // Create audio element only once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new window.Audio(src);
    } else {
      audioRef.current.src = src;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src]);

  // Attach event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };
    const updateDuration = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
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

  // Handle seeking
  useEffect(() => {
    const audio = audioRef.current;
    if (seekTime !== null && audio) {
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
      setSeekTime(null);
      audio.play();
      setIsPlaying(true);
    }
  }, [seekTime]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    setSeekTime(time);
  }, []);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
    audio.pause();
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    togglePlay,
    seek,
    reset,
    setSeekTime,
    setCurrentTime,
    setDuration,
  };
}
