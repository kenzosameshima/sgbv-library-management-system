import { z } from "zod";

export const reservationSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID").optional(),
  bookId: z.string().uuid("Book ID must be a valid UUID")
}).strict();
