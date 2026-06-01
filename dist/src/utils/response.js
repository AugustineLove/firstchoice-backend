"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, data, statusCode = 200, message) => {
    res.status(statusCode).json({
        success: true,
        ...(message && { message }),
        data,
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 400) => {
    res.status(statusCode).json({
        success: false,
        message,
    });
};
exports.sendError = sendError;
//# sourceMappingURL=response.js.map