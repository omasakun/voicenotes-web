import { type ClassValue, clsx } from "clsx";
import { randomBytes } from "crypto";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
