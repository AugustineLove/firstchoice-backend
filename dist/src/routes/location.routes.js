"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/location.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const location_controlller_1 = require("../controllers/location.controlller");
const locationRouter = (0, express_1.Router)();
// Public — customer app reads these to populate pickup/destination pickers
locationRouter.get('/', location_controlller_1.getLocations);
// Admin only — this is what your "basic simple app" (the location-capture tool) will hit
locationRouter.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), location_controlller_1.createLocation);
locationRouter.patch('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), location_controlller_1.updateLocation);
locationRouter.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'), location_controlller_1.deleteLocation);
exports.default = locationRouter;
//# sourceMappingURL=location.routes.js.map