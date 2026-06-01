"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
function errorHandler(err, req, res, next) {
    // Prisma errors
    if (err.code === 'P2002') {
        res.status(409).json({
            success: false,
            message: 'A record with this value already exists',
            field: err.meta?.target,
        });
        return;
    }
    if (err.code === 'P2025') {
        res.status(404).json({
            success: false,
            message: 'Record not found',
        });
        return;
    }
    if (err.code === 'P2003') {
        res.status(400).json({
            success: false,
            message: 'Related record not found',
        });
        return;
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            success: false,
            message: 'Token has expired',
        });
        return;
    }
    // Validation errors
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Operational errors we threw ourselves
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Unknown/unexpected errors
    console.error('UNEXPECTED ERROR:', err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again later.',
    });
}
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
}
//# sourceMappingURL=error.middleware.js.map