"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPlaybackTime } from "@/lib/utils";
import type { Sentence, WhisperVerboseResponse, WordTiming } from "@/types/transcription";

interface InteractiveTranscriptionProps {
  transcription: string;
  whisperData: string | null;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function InteractiveTranscription({
  transcription,
  whisperData,
  currentTime,
  onSeek,
}: InteractiveTranscriptionProps) {
  const [sentences, setSentences] = useState<Sentence[]>([]);

  const parsedWordTimings = useMemo(() => {
    if (!whisperData) return [];
    try {
      const whisperResponse = JSON.parse(whisperData) as WhisperVerboseResponse;
      return whisperResponse.words || [];
    } catch {
      return [];
    }
  }, [whisperData]);

  // Group words into sentences
  useEffect(() => {
    if (parsedWordTimings.length === 0) {
      setSentences([]);
      return;
    }

    const groupedSentences: Sentence[] = [];
    let currentSentence: WordTiming[] = [];
    const maxWordsPerSentence = 100;

    for (const wordTiming of parsedWordTimings) {
      currentSentence.push(wordTiming);

      const endsWithPunctuation = /[.!?。！？]/.test(wordTiming.word);
      const sentenceTooLong = currentSentence.length >= maxWordsPerSentence;

      if (endsWithPunctuation || sentenceTooLong) {
        if (currentSentence.length > 0) {
          const sentence: Sentence = {
            words: [...currentSentence],
            start: currentSentence[0].start,
            end: currentSentence[currentSentence.length - 1].end,
            text: currentSentence.map((w) => w.word).join(" "),
          };
          groupedSentences.push(sentence);
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
      groupedSentences.push(sentence);
    }

    setSentences(groupedSentences);
  }, [parsedWordTimings]);

  const activeSentenceIndex = useMemo(() => {
    return sentences.findIndex((sentence) => currentTime >= sentence.start && currentTime <= sentence.end);
  }, [sentences, currentTime]);

  if (!whisperData || sentences.length === 0) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Transcription</CardTitle>
        <CardDescription>
          Click on any sentence to jump to that part of the audio. Highlighted text shows the current playback position.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sentences.map((sentence, sentenceIndex) => (
            <button
              key={`sentence-${sentence.start}-${sentence.end}`}
              type="button"
              className={`
                w-full text-left p-3 rounded-lg cursor-pointer transition-all duration-200 text-sm leading-relaxed
                ${
                  sentenceIndex === activeSentenceIndex
                    ? "bg-blue-100 border-2 border-blue-300 shadow-sm"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                }
              `}
              onClick={() => onSeek(sentence.start)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="grid">
                    <div className="flex flex-wrap col-1 row-1 text-transparent select-none">
                      {sentence.words.map((word) => {
                        const isHighlighted = word.start <= currentTime && currentTime <= word.end;

                        return (
                          <span
                            key={`word-${word.start}-${word.end}`}
                            className={cn(
                              "transition-all duration-100 rounded -mx-1 px-1",
                              isHighlighted ? "font-semibold bg-blue-300" : "",
                            )}
                          >
                            {word.word}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap col-1 row-1">
                      {sentence.words.map((word) => {
                        const isHighlighted = word.start <= currentTime && currentTime <= word.end;

                        return (
                          // biome-ignore lint/a11y/noStaticElementInteractions: // TODO
                          // biome-ignore lint/a11y/useKeyWithClickEvents: // TODO
                          <div
                            key={`word-${word.start}-${word.end}`}
                            className={cn(
                              "transition-all duration-100",
                              isHighlighted ? "font-semibold text-blue-900" : "",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeek(word.start);
                            }}
                          >
                            {word.word}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatPlaybackTime(sentence.start)} - {formatPlaybackTime(sentence.end)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
