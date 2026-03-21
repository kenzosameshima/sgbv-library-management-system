import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../utils/httpError";
import { createEmailSchema, createStringSchema } from "../utils/validation";
import { countUsers, createUser, findUserByEmail } from "../repositories/userRepository";
import { Role } from "../models/types";
import { listFinesByUser, payFine } from "../repositories/fineRepository";

const createUserSchema = z.object({
  name: createStringSchema(2, 255, "Nome"),
  email: createEmailSchema(),
  password: createStringSchema(8, 255, "Senha"),
  role: z.enum(["USER", "ADMIN"]).default("USER")
}).strict();

export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = createUserSchema.parse(req.body);
    const existing = await findUserByEmail(payload.email);

    if (existing) {
      throw new HttpError(409, "Email ja cadastrado");
    }

    const usersCount = await countUsers();
    if (usersCount > 0) {
      if (!req.user || req.user.role !== "ADMIN") {
        throw new HttpError(403, "Apenas ADMIN pode cadastrar novos usuarios");
      }
    }

    const role: Role = usersCount === 0 ? "ADMIN" : payload.role;
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
      role
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserFinesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user || (req.user.id !== id && req.user.role !== "ADMIN")) {
      throw new HttpError(403, "Sem permissao para consultar multas deste usuario");
    }

    const fines = await listFinesByUser(id);
    res.status(200).json(fines);
  } catch (error) {
    next(error);
  }
}

export async function payFineHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schema = z.object({ fineId: z.string().uuid("ID deve ser um UUID válido") }).strict();
    const { fineId } = schema.parse(req.body);

    const fine = await payFine(fineId);
    if (!fine) {
      throw new HttpError(404, "Multa nao encontrada ou ja paga");
    }

    res.status(200).json(fine);
  } catch (error) {
    next(error);
  }
}
