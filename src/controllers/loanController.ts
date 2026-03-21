import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../utils/httpError";
import { createLoanForUser, returnLoanByIdForUser, returnLoanForUser } from "../services/loanService";
import { listLoansByUser } from "../repositories/loanRepository";

const uuidSchema = z.string().uuid("ID deve ser um UUID válido");

const loanSchema = z.object({
  userId: uuidSchema.optional(),
  bookId: uuidSchema
}).strict();

const returnSchema = z
  .object({
    userId: uuidSchema.optional(),
    bookId: uuidSchema.optional(),
    loanId: uuidSchema.optional()
  })
  .strict()
  .refine((data) => Boolean(data.bookId || data.loanId), {
    message: "Informe bookId ou loanId"
  });

export async function createLoanHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = loanSchema.parse(req.body);
    const userId = req.user?.role === "ADMIN" && payload.userId ? payload.userId : req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Usuario nao autenticado" });
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
      res.status(401).json({ message: "Usuario nao autenticado" });
      return;
    }

    const result = payload.loanId
      ? await returnLoanByIdForUser(userId, payload.loanId)
      : await returnLoanForUser(userId, payload.bookId as string);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listLoanHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const targetUserId = req.params.userId;

    if (!req.user || (req.user.role !== "ADMIN" && req.user.id !== targetUserId)) {
      res.status(403).json({ message: "Sem permissao para consultar este historico" });
      return;
    }

    const history = await listLoansByUser(targetUserId);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
}
