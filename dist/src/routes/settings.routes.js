"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settings_controller_1 = require("../controllers/settings.controller");
const settingsRouter = (0, express_1.Router)();
settingsRouter.get('/errand', settings_controller_1.getErrandSettings);
exports.default = settingsRouter;
//# sourceMappingURL=settings.routes.js.map