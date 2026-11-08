import { NextFunction, Request, Response } from "express";
import { findBookById } from "../repositories/bookRepository";
import { createQueuedReservation, hasUserQueuedReservation } from "../repositories/reservationRepository";
import { reservationSchema } from "../schemas/reservation";
import { HttpError } from "../utils/httpError";

export async function createReservationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = reservationSchema.parse(req.body);
    const userId = req.user?.role === "ADMIN" && payload.userId ? payload.userId : req.user?.id;

    if (!userId) {
      throw new HttpError(401, "User not authenticated");
    }

    const book = await findBookById(payload.bookId);
    if (!book) {
      throw new HttpError(404, "Book not found");
    }

    if (book.available_copies > 0) {
      throw new HttpError(400, "Book is available. No reservation needed");
    }

    if (await hasUserQueuedReservation(userId, payload.bookId)) {
      throw new HttpError(409, "User already has an active reservation for this book");
    }

    const reservation = await createQueuedReservation({ userId, bookId: payload.bookId });
    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
}
