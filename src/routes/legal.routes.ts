import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { registerLegalRoutes } from "../services/legal.service";


const legalRouter = Router();
registerLegalRoutes(legalRouter, authenticate);

export default legalRouter;