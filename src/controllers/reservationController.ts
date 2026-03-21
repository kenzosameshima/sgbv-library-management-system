import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { findBookById } from "../repositories/bookRepository";
import { createQueuedReservation, hasUserQueuedReservation } from "../repositories/reservationRepository";
import { HttpError } from "../utils/httpError";

const reservationSchema = z.object({
  userId: z.string().uuid("ID de usuário deve ser um UUID válido").optional(),
  bookId: z.string().uuid("ID de livro deve ser um UUID válido")
}).strict();

export async function createReservationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = reservationSchema.parse(req.body);
    const userId = req.user?.role === "ADMIN" && payload.userId ? payload.userId : req.user?.id;

    if (!userId) {
      throw new HttpError(401, "Usuario nao autenticado");
    }

    const book = await findBookById(payload.bookId);
    if (!book) {
      throw new HttpError(404, "Livro nao encontrado");
    }

    if (book.available_copies > 0) {
      throw new HttpError(400, "Livro disponivel. Nao e necessario reservar");
    }

    if (await hasUserQueuedReservation(userId, payload.bookId)) {
      throw new HttpError(409, "Usuario ja possui reserva ativa para este livro");
    }

    const reservation = await createQueuedReservation({ userId, bookId: payload.bookId });
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
}
