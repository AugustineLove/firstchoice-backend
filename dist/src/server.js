"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_manager_1 = require("./socket/socket.manager");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
// Create HTTP server from Express app
const httpServer = http_1.default.createServer(app_1.default);
// Attach Socket.IO
const io = (0, socket_manager_1.initSocket)(httpServer);
app_1.default.set('io', io);
httpServer.listen(PORT, () => {
    console.log(`🚀 Robust server running on http://localhost:${PORT}`);
    console.log(`⚡ Socket.IO ready`);
});
//# sourceMappingURL=server.js.map