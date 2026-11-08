import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../utils/constants";
import { createEmailSchema, createStringSchema } from "../utils/validation";

export const loginSchema = z.object({
  email: createEmailSchema(),
  password: createStringSchema(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, "Password")
}).strict();

export const refreshSchema = z.object({
  refreshToken: createStringSchema(1, 1000, "Refresh token")
}).strict();
