import { z } from "zod";

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9][a-z0-9._-]{2,31}$/,
    "Use 3–32 letters, numbers, periods, underscores, or hyphens. Start with a letter or number.",
  );
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const byteLimit = (value: string) =>
  new TextEncoder().encode(value).length <= 72;
const password = z
  .string()
  .min(1)
  .max(72)
  .refine(byteLimit, "Use at most 72 bytes.");

export const signupInput = z
  .object({
    orgName: z.string().trim().min(1).max(100),
    fullName: z.string().trim().min(1).max(100),
    username,
    email,
    password: z.string().min(12).pipe(password),
  })
  .strict();

export const loginInput = z
  .object({
    identifier: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.union([email, username])),
    password,
  })
  .strict();
