import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { registerLegalRoutes } from "../services/legal.service";
import { registerLegalPageRoutes } from "../services/legal.admin.service";


const legalRouter = Router();
registerLegalRoutes(legalRouter, authenticate);
registerLegalPageRoutes(legalRouter);

export default legalRouter;