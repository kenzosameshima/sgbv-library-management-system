import bcrypt from "bcrypt";
import { NextFunction, Request, Response } from "express";
import { createUserSchema, payFineSchema } from "../schemas/user";
import { HttpError } from "../utils/httpError";
import { countUsers, createUser, findUserByEmail } from "../repositories/userRepository";
import { Role } from "../models/types";
import { listFinesByUser, payFine } from "../repositories/fineRepository";
import { BCRYPT_SALT_ROUNDS } from "../utils/constants";

export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = createUserSchema.parse(req.body);
    const existing = await findUserByEmail(payload.email);

    if (existing) {
      throw new HttpError(409, "Email already registered");
    }

    const usersCount = await countUsers();
    if (usersCount > 0) {
      if (!req.user || req.user.role !== "ADMIN") {
        throw new HttpError(403, "Only ADMIN can register new users");
      }
    }

    const role: Role = usersCount === 0 ? "ADMIN" : payload.role;
    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);
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
      throw new HttpError(403, "You do not have permission to view this user's fines");
    }

    const fines = await listFinesByUser(id);
    res.status(200).json(fines);
  } catch (error) {
    next(error);
  }
}

export async function payFineHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fineId } = payFineSchema.parse(req.body);

    const fine = await payFine(fineId);
    if (!fine) {
      throw new HttpError(404, "Fine not found or already paid");
    }

    res.status(200).json(fine);
  } catch (error) {
    next(error);
  }
}
