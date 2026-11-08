import { NextFunction, Request, Response } from "express";
import { loanSchema, returnSchema } from "../schemas/loan";
import { HttpError } from "../utils/httpError";
import { createLoanForUser, returnLoanByIdForUser, returnLoanForUser } from "../services/loanService";
import { listLoansByUser } from "../repositories/loanRepository";

export async function createLoanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = loanSchema.parse(req.body);
    const userId = req.user?.role === "ADMIN" && payload.userId ? payload.userId : req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const loan = await createLoanForUser(userId, payload.bookId);
    res.status(201).json(loan);
  } catch (error) {
    next(error);
  }
}

export async function returnLoanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = returnSchema.parse(req.body);
    const userId = req.user?.role === "ADMIN" && payload.userId ? payload.userId : req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (payload.loanId) {
      res.status(200).json(await returnLoanByIdForUser(userId, payload.loanId));
    } else if (payload.bookId) {
      res.status(200).json(await returnLoanForUser(userId, payload.bookId));
    } else {
      throw new HttpError(400, "Provide bookId or loanId");
    }
  } catch (error) {
    next(error);
  }
}

export async function listLoanHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = req.params.userId;

    if (!req.user || (req.user.role !== "ADMIN" && req.user.id !== targetUserId)) {
      res.status(403).json({ message: "You do not have permission to view this history" });
      return;
    }

    const history = await listLoansByUser(targetUserId);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
}
