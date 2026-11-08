import { z } from "zod";

/** Trimmed string schema with length limits; `description` names the field in error messages. */
export function createStringSchema(minLength = 1, maxLength = 500, description = "Text"): z.ZodType<string> {
  return z
    .string()
    .trim()
    .min(minLength, `${description} must have at least ${minLength} characters`)
    .max(maxLength, `${description} must have at most ${maxLength} characters`);
}

/** Trimmed, lower-cased email schema. */
export function createEmailSchema(): z.ZodType<string> {
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email must not be empty")
    .max(255, "Email is too long")
    .email("Invalid email");
}
