import { randomBytes } from "node:crypto";
import type { ReadStream } from "node:fs";
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
