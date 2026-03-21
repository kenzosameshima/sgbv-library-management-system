import { Role } from "../models/types";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: Role;
      email: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
