import { z } from "zod";

const uuidSchema = z.string().uuid("ID must be a valid UUID");

export const loanSchema = z.object({
  userId: uuidSchema.optional(),
  bookId: uuidSchema
}).strict();

export const returnSchema = z
  .object({
    userId: uuidSchema.optional(),
    bookId: uuidSchema.optional(),
    loanId: uuidSchema.optional()
  })
  .strict();
