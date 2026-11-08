import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../utils/constants";
import { createEmailSchema, createStringSchema } from "../utils/validation";

export const createUserSchema = z.object({
  name: createStringSchema(2, 255, "Name"),
  email: createEmailSchema(),
  password: createStringSchema(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, "Password"),
  role: z.enum(["USER", "ADMIN"]).default("USER")
}).strict();

export const payFineSchema = z.object({ fineId: z.string().uuid("ID must be a valid UUID") }).strict();
