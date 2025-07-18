import { compare, genSalt, hash } from "bcryptjs";

const saltRounds = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = await genSalt(saltRounds);
  return hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(password, hashedPassword);
}
