"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.prodLogger = exports.devLogger = void 0;
const morgan_1 = __importDefault(require("morgan"));
// Custom token — log user id if authenticated
morgan_1.default.token('user-id', (req) => {
    return req.user?.id || 'guest';
});
morgan_1.default.token('body', (req) => {
    const body = { ...req.body };
    // Never log passwords
    if (body.password)
        body.password = '***';
    if (body.currentPassword)
        body.currentPassword = '***';
    if (body.newPassword)
        body.newPassword = '***';
    return JSON.stringify(body);
});
// Development — verbose
exports.devLogger = (0, morgan_1.default)(':method :url :status :response-time ms — user::user-id');
// Production — minimal
exports.prodLogger = (0, morgan_1.default)(':method :url :status :response-time ms');
exports.logger = process.env.NODE_ENV === 'production'
    ? exports.prodLogger
    : exports.devLogger;
//# sourceMappingURL=logger.middleware.js.map