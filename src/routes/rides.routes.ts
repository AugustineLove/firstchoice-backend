import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { h } from "../controllers/pros.controller";
import { cancelRide, estimateRide, getMyRides, getRide, listRates, requestRide } from "../services/rides.service";


const ridesRouter = Router();
ridesRouter.use(authenticate);
// Fixed paths first, so '/:id' doesn't swallow them.
ridesRouter.get('/rates', h(() => listRates()));
ridesRouter.post('/estimate', h((req) => estimateRide(req.body)));
ridesRouter.get('/mine', h((req) => getMyRides(req.user!.id)));
ridesRouter.post('/', h((req) => requestRide(req.user!.id, req.body), 201));
ridesRouter.get('/:id', h((req) => getRide(req.params.id as string, req.user!.id)));
ridesRouter.post('/:id/cancel', h((req) => cancelRide(req.params.id as string, req.user!.id)));


export default ridesRouter;