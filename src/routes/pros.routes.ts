import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { requireService } from "../services/service-flags.service";
import {  getProfessional, listProfessionals, listTrades, logContact, reviewProfessional } from "../services/pros.service";
import { AuthRequest } from "../interface/auth-request.interface.ts";
import { h } from "../controllers/pros.controller";


const prosRouter = Router();
prosRouter.use(authenticate, authorize('CUSTOMER'), requireService('PROFESSIONAL'));

prosRouter.get('/trades', h(() => listTrades()));
prosRouter.get('/', h((req) =>
  listProfessionals({
    tradeId: req.query.tradeId as string | undefined,
    search: req.query.search as string | undefined,
    sort: req.query.sort as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  })));
prosRouter.get('/:id', h((req) => getProfessional(req.params.id as string, req.user!.id)));
prosRouter.post('/:id/contact', h((req) => logContact(req.params.id as string, req.user!.id)));
prosRouter.post('/:id/reviews', h((req) => reviewProfessional(req.params.id as string, req.user!.id, req.body)));
export default prosRouter;