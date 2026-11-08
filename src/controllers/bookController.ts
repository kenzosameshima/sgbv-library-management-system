import { NextFunction, Request, Response } from "express";
import { bookSchema } from "../schemas/book";
import { createBook, deleteBook, findBookById, listBooks, updateBook } from "../repositories/bookRepository";
import { HttpError } from "../utils/httpError";

/** A query parameter is only usable when it is a single string (not an array or nested object). */
function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function listBooksHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const books = await listBooks({
      title: queryString(req.query.title),
      author: queryString(req.query.author),
      category: queryString(req.query.category)
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
      if (!(await findBookById(req.params.id))) {
        throw new HttpError(404, "Book not found");
      }

      throw new HttpError(409, "Total copies is lower than the number of copies on loan");
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
