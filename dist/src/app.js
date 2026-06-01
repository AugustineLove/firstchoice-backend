"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const logger_middleware_1 = require("./middleware/logger.middleware");
const sanitize_middleware_1 = require("./middleware/sanitize.middleware");
const allroutes_1 = __importDefault(require("./routes/allroutes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10kb' })); // block huge payloads
app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
app.use(sanitize_middleware_1.sanitizeInput);
app.use(sanitize_middleware_1.preventParamPollution);
app.use(logger_middleware_1.logger);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(allroutes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
exports.default = app;
//# sourceMappingURL=app.js.map