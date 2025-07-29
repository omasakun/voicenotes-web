export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface Sentence {
  words: WordTiming[];
  start: number;
  end: number;
  text: string;
}

export interface RevisedSegment {
  start: number;
  end: number;
  words: WordTiming[];
}

export interface RevisedSegments {
  segments: RevisedSegment[];
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WhisperVerboseResponse {
  language: string;
  duration: number;
  text: string;
  words?: WordTiming[];
  segments?: WhisperSegment[];
}

export interface WhisperDelta {
  words?: WordTiming[];
  segment: WhisperSegment;
}

export interface WhisperInfo {
  language: string;
  duration: number;
}
