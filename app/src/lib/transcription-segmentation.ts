import type { WordTiming, RevisedSegments, RevisedSegment, WhisperVerboseResponse } from "@/types/transcription";

export function createTimeBasedSegments(words: WordTiming[]): RevisedSegment[] {
  if (words.length === 0) return [];

  const segments: RevisedSegment[] = [];
  let currentSegmentWords: WordTiming[] = [];
  let segmentStartTime = words[0].start;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentSegmentWords.push(word);

    const isAtPunctuation = /[。！？.!?]/.test(word.word);
    const isLastWord = i === words.length - 1;

    if (isAtPunctuation || isLastWord) {
      if (currentSegmentWords.length > 0) {
        segments.push({
          start: segmentStartTime,
          end: currentSegmentWords[currentSegmentWords.length - 1].end,
          words: [...currentSegmentWords],
        });

        currentSegmentWords = [];
        if (!isLastWord) {
          segmentStartTime = words[i + 1]?.start || word.end;
        }
      }
    }
  }

  return segments;
}

export function mergeSegments(segments: RevisedSegment[], targetDurationSeconds = 60): RevisedSegment[] {
  if (segments.length === 0) return [];

  const [first, ...rest] = segments;
  const mergedSegments: RevisedSegment[] = [first];
  for (const segment of rest) {
    const currentDuration = segment.end - mergedSegments.at(-1)!.start;
    const shouldBreak = currentDuration >= targetDurationSeconds;
    if (shouldBreak) {
      mergedSegments.push(segment);
    } else {
      const lastSegment = mergedSegments.at(-1)!;
      lastSegment.end = segment.end;
      lastSegment.words.push(...segment.words);
    }
  }
  return mergedSegments;
}

export function getSegmentsFromRecording(recording: {
  revisedSegments: string | null;
  whisperData: string | null;
  transcription: string | null;
  duration: number | null;
}): RevisedSegment[] {
  // First try to use revised segments
  if (recording.revisedSegments) {
    try {
      const revisedSegments: RevisedSegments = JSON.parse(recording.revisedSegments);
      return mergeSegments(revisedSegments.segments);
    } catch (error) {
      console.error("Failed to parse revised segments:", error);
    }
  }

  // Fallback to whisper data if available
  if (recording.whisperData) {
    try {
      const whisperData: WhisperVerboseResponse = JSON.parse(recording.whisperData);
      if (whisperData.segments && whisperData.words) {
        return mergeSegments(
          whisperData.segments.map((segment) => {
            const segmentWords = whisperData.words!.filter(
              (word) => word.start >= segment.start && word.end <= segment.end,
            );

            return {
              start: segment.start,
              end: segment.end,
              text: segment.text,
              words: segmentWords,
            };
          }),
        );
      }
    } catch (error) {
      console.error("Failed to parse whisper data:", error);
    }
  }

  // Final fallback: create a single segment from the transcription text
  if (recording.transcription) {
    return [
      {
        start: 0,
        end: recording.duration || 0,
        words: [
          {
            word: recording.transcription,
            start: 0,
            end: recording.duration || 0,
          },
        ],
      },
    ];
  }

  return [];
}
