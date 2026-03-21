import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { createStringSchema } from "../utils/validation";
import { createBook, deleteBook, listBooks, updateBook } from "../repositories/bookRepository";
import { HttpError } from "../utils/httpError";

const bookSchema = z.object({
  title: createStringSchema(1, 500, "Título"),
  author: createStringSchema(1, 255, "Autor"),
  category: createStringSchema(1, 100, "Categoria"),
  isbn: createStringSchema(10, 20, "ISBN"),
  totalCopies: z.number().int().positive("Total de cópias deve ser positivo")
}).strict();

export async function listBooksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const books = await listBooks({
      title: req.query.title as string | undefined,
      author: req.query.author as string | undefined,
      category: req.query.category as string | undefined
    });

    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
}

export async function createBookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = bookSchema.parse(req.body);
    const book = await createBook(payload);
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
}

export async function updateBookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = bookSchema.parse(req.body);
    const updated = await updateBook(req.params.id, payload);

    if (!updated) {
      throw new HttpError(404, "Livro nao encontrado");
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteBookHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await deleteBook(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
