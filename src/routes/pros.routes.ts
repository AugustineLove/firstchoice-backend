import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { requireService } from "../services/service-flags.service";
import { acceptQuote, cancelMyJob, createJob, getMyJob, listMyJobs, listTrades } from "../services/pros.service";
import { AuthRequest } from "../interface/auth-request.interface.ts";
import { h } from "../controllers/pros.controller";


const prosRouter = Router();
prosRouter.use(authenticate, authorize('CUSTOMER'), requireService('PROFESSIONAL'));

prosRouter.get('/trades', h(() => listTrades()));
prosRouter.post('/jobs', h((req) => createJob(req.user!.id, req.body), 201));
prosRouter.get('/jobs', h((req) => listMyJobs(req.user!.id)));
prosRouter.get('/jobs/:id', h((req) => getMyJob(req.params.id as string, req.user!.id)));
prosRouter.patch('/jobs/:id/accept-quote', h((req) => acceptQuote(req.params.id as string, req.user!.id)));
prosRouter.patch('/jobs/:id/cancel', h((req) => cancelMyJob(req.params.id as string, req.user!.id)));

export default prosRouter;