import OpenAI from "openai";
import diff from "fast-diff";
import type { RevisedSegments, WordTiming } from "@/types/transcription";
import { createTimeBasedSegments } from "./transcription-segmentation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processTranscription(
  originalText: string,
  originalWords: WordTiming[],
): Promise<RevisedSegments> {
  const punctuatedText = await addPunctuationWithChatGPT(originalText);
  const alignedWords = alignTextWithTimestamps(originalWords, punctuatedText);
  const segments = createTimeBasedSegments(alignedWords);
  return { segments };
}

async function addPunctuationWithChatGPT(originalText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content: [
            "Correct any missing punctuation marks in the following transcribed text. ",
            "Preserve any spoken errors and output any mispronunciations or incomplete sentences as they are. ",
            "Return only the corrected text, with no additional formatting or numbering. ",
            "Process all the text in one go, do not split it into multiple requests.",
          ].join(""),
        },
        {
          role: "user",
          content: originalText,
        },
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content?.replaceAll("\n", "").trim() || originalText;
  } catch (error) {
    console.error("ChatGPT punctuation failed:", error);
    return originalText;
  }
}

function alignTextWithTimestamps(originalWords: WordTiming[], revisedText: string): WordTiming[] {
  const a = originalWords.flatMap((w) =>
    Array.from(w.word).map((char) => ({ word: char, start: w.start, end: w.end })),
  );
  const b = Array.from(revisedText).map((char) => ({ word: char, start: 0, end: 0 }));

  const normalizeText = (text: string) => text.toLowerCase();
  const diffs = diff(normalizeText(a.map((w) => w.word).join("")), normalizeText(b.map((c) => c.word).join("")));
  let aIndex = 0;
  let bIndex = 0;

  for (const [op, chunk] of diffs) {
    if (op === 0) {
      // equal: align each character
      for (let k = 0; k < chunk.length; k++) {
        const aToken = a[aIndex];
        const bToken = b[bIndex];
        bToken.start = aToken.start;
        bToken.end = aToken.end;
        aIndex++;
        bIndex++;
      }
    } else if (op === -1) {
      // only in original: skip
      aIndex += chunk.length;
    } else if (op === 1) {
      // only in revised: append to the last word
      // TODO: add to next word depending on context
      for (let k = 0; k < chunk.length; k++) {
        const bToken = b[bIndex];
        const bLast = b.at(bIndex - 1);
        if (bLast) {
          bToken.start = bLast.start;
          bToken.end = bLast.end;
        }
        bIndex++;
      }
    }
  }

  // merge tokens with the same start and end times
  const merged: WordTiming[] = [];
  for (const word of b) {
    const last = merged.at(-1);
    if (last && last.start === word.start && last.end === word.end) {
      last.word += word.word;
    } else {
      merged.push({ word: word.word, start: word.start, end: word.end });
    }
  }
  return merged;
}
