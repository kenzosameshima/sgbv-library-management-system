import { z } from "zod";
import { createStringSchema } from "../utils/validation";

export const bookSchema = z.object({
  title: createStringSchema(1, 500, "Title"),
  author: createStringSchema(1, 255, "Author"),
  category: createStringSchema(1, 100, "Category"),
  isbn: createStringSchema(10, 20, "ISBN"),
  totalCopies: z.number().int().positive("Total copies must be positive")
}).strict();
