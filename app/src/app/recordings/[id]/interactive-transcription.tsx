"use client";

import { Loader } from "lucide-react";
import { memo, useMemo } from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPlaybackTime } from "@/lib/utils";
import type { Sentence, WhisperVerboseResponse, WordTiming } from "@/types/transcription";

interface InteractiveTranscriptionProps {
  transcription: string;
  whisperData: string | null;
  status: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export const InteractiveTranscription = memo(function InteractiveTranscription({
  transcription,
  whisperData,
  status,
  currentTime,
  onSeek,
}: InteractiveTranscriptionProps) {
  const wordTimings = useMemo(() => {
    if (!whisperData) return [];
    try {
      const whisperResponse = JSON.parse(whisperData) as WhisperVerboseResponse;
      return whisperResponse.words || [];
    } catch (error) {
      console.error("Failed to parse whisper data:", error);
      return [];
    }
  }, [whisperData]);

  const sentences = useMemo(() => getSentences(wordTimings), [wordTimings]);

  const isProcessing = status === "PROCESSING";

  if (sentences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{isProcessing ? "Transcription in Progress" : "Transcription"}</CardTitle>
          <CardDescription>
            {isProcessing
              ? "Your audio is being transcribed. The text will update in real-time as processing continues."
              : "Automatically generated transcript of your audio recording"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{transcription}</p>
            {isProcessing && (
              <Alert variant="info" className="mt-4">
                <Loader className="animate-spin" />
                <AlertTitle>The transcription is currently being processed...</AlertTitle>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isProcessing ? "Transcription in Progress" : "Interactive Transcription"}</CardTitle>
        <CardDescription>
          {isProcessing
            ? "Transcription is being generated in real-time. Click on any completed sentence to jump to that part of the audio."
            : "Click on any sentence to jump to that part of the audio. Highlighted text shows the current playback position."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sentences.map((sentence, sentenceIndex) => {
            const isActive = sentence.start <= currentTime && currentTime <= sentence.end;
            return (
              <SentenceBlock
                key={`sentence-${sentence.start}-${sentenceIndex}`}
                sentence={sentence}
                isActive={isActive}
                currentTime={isActive ? currentTime : null}
                onSeek={onSeek}
              />
            );
          })}
          {isProcessing && (
            <Alert variant="info" className="mt-4">
              <Loader className="animate-spin" />
              <AlertTitle>The transcription is currently being processed...</AlertTitle>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

interface SentenceBlockProps {
  sentence: Sentence;
  isActive: boolean;
  currentTime: number | null; // null if not active (performance optimization)
  onSeek: (time: number) => void;
}

const SentenceBlock = memo(function SentenceBlock({ sentence, isActive, currentTime, onSeek }: SentenceBlockProps) {
  return (
    <button
      type="button"
      className={`w-full cursor-pointer rounded-lg p-3 text-left text-sm leading-relaxed transition-all duration-200 ${
        isActive
          ? "border border-blue-300 bg-blue-100 shadow-sm"
          : "border border-gray-200 bg-gray-50 hover:bg-gray-100"
      } `}
      onClick={() => onSeek(sentence.start)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="grid">
            <div className="col-1 row-1 flex select-none flex-wrap text-transparent">
              {sentence.words.map((word, wordIndex) => {
                const isActive = currentTime !== null && word.start <= currentTime && currentTime <= word.end + 0.1;
                return <WordBackgroundBlock key={`bg-${word.start}-${wordIndex}`} word={word} isActive={isActive} />;
              })}
            </div>
            <div className="col-1 row-1 flex flex-wrap">
              {sentence.words.map((word, wordIndex) => {
                const isActive = currentTime !== null && word.start <= currentTime && currentTime <= word.end + 0.1;
                return (
                  <WordTextBlock
                    key={`text-${word.start}-${wordIndex}`}
                    word={word}
                    isActive={isActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(word.start);
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="whitespace-nowrap text-xs text-gray-500">
          {formatPlaybackTime(sentence.start)} - {formatPlaybackTime(sentence.end)}
        </div>
      </div>
    </button>
  );
});

const WordBackgroundBlock = memo(function WordBackgroundBlock({
  word,
  isActive,
}: {
  word: WordTiming;
  isActive: boolean;
}) {
  return (
    <span
      className={cn(
        "-mx-1 rounded px-1 transition-all duration-100",
        isActive ? "bg-blue-300 font-semibold" : "bg-transparent",
      )}
    >
      {word.word}
    </span>
  );
});

const WordTextBlock = memo(function WordTextBlock({
  word,
  isActive,
  onClick,
}: {
  word: WordTiming;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <span
      className={cn("transition-all duration-100", isActive ? "font-semibold text-blue-900" : "")}
      onClick={onClick}
    >
      {word.word}
    </span>
  );
});

function getSentences(wordTimings: WordTiming[]): Sentence[] {
  const sentences: Sentence[] = [];
  let currentSentence: WordTiming[] = [];

  for (const wordTiming of wordTimings) {
    currentSentence.push(wordTiming);

    const endsWithPunctuation = /[.!?。！？]/.test(wordTiming.word);
    const sentenceTooLong = currentSentence.length >= 500;

    if (endsWithPunctuation || sentenceTooLong) {
      if (currentSentence.length > 0) {
        const sentence: Sentence = {
          words: [...currentSentence],
          start: currentSentence[0].start,
          end: currentSentence[currentSentence.length - 1].end,
          text: currentSentence.map((w) => w.word).join(" "),
        };
        sentences.push(sentence);
        currentSentence = [];
      }
    }
  }

  if (currentSentence.length > 0) {
    const sentence: Sentence = {
      words: [...currentSentence],
      start: currentSentence[0].start,
      end: currentSentence[currentSentence.length - 1].end,
      text: currentSentence.map((w) => w.word).join(" "),
    };
    sentences.push(sentence);
  }

  return sentences;
}
