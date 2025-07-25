import { randomBytes } from "node:crypto";
import type { ReadStream } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import busboy, { type BusboyFileStream } from "@fastify/busboy";
import { DeferredAsyncIterator } from "./deferred";

export function randomBase32(length: number): string {
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let result = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] & 0x1f; // Mask to get 5 bits
    result += base32Chars[byte];
  }
  return result;
}

export async function* streamToAsyncIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export function streamFromNodeStream(stream: ReadStream): ReadableStream<Uint8Array | string> {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on("end", () => {
        controller.close();
      });
      stream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      stream.destroy();
    },
  });
}

type FormDataEntry =
  | {
      type: "field";
      name: string;
      value: string;
    }
  | {
      type: "file";
      name: string;
      file: BusboyFileStream;
      filename: string;
      encoding: string;
      mimeType: string;
    };

export function parseFormData(request: Request): AsyncIterable<FormDataEntry> {
  return {
    [Symbol.asyncIterator]: () => {
      if (!request.headers.has("content-type")) {
        throw new Error("No content-type header found");
      }

      if (!request.body) {
        throw new Error("No body found in request");
      }

      const deferred = new DeferredAsyncIterator<FormDataEntry>();

      // @ts-ignore busboy
      const form = busboy({ headers: Object.fromEntries(request.headers) });

      form.on("field", (name, value) => {
        deferred.push({ type: "field", name, value });
      });

      form.on("file", (name, file, filename, encoding, mimeType) => {
        deferred.push({
          type: "file",
          name,
          file,
          filename,
          encoding,
          mimeType,
        });
      });

      form.on("finish", () => {
        deferred.finish();
      });

      form.on("error", (err) => {
        deferred.finishWithError(err);
      });

      const nodeStream = Readable.from(streamToAsyncIterable(request.body));
      nodeStream.pipe(form);

      return deferred;
    },
  };
}

export async function* parseJSONLStream<T>(stream: NodeJS.ReadableStream): AsyncGenerator<T> {
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  }
  if (buffer.trim()) {
    yield JSON.parse(buffer);
  }
}

// Not spec compliant, but good enough for our use case
export async function* parseSseResponse(response: Response): AsyncGenerator<{ event: string; data: string }> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  if (!reader) {
    throw new Error("No response body");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const delimiterRegex = /(\r\n\r\n|\n\n|\r\r)/g;
      const match = delimiterRegex.exec(buffer);
      const delimiterPos = match ? match.index : -1;
      const delimiterLen = match ? match[0].length : 0;
      if (delimiterPos === -1) break;

      const rawEvent = buffer.slice(0, delimiterPos).trim();
      buffer = buffer.slice(delimiterPos + delimiterLen);

      let event = "message";
      let data = "";

      for (const line of rawEvent.split("\n")) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (data) {
        yield { event, data };
      }
    }
  }
}

export function changeExtension(filePath: string, newExt: string): string {
  const parsed = path.parse(filePath);
  return path.format({ ...parsed, base: undefined, ext: newExt });
}
