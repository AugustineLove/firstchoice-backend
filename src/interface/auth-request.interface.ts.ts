import { Request } from "express";
import { Role } from "../../generated/prisma/enums";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: Role;
  };
}