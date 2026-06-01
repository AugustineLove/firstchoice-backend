import http from 'http';
import app from './app';
import dotenv from 'dotenv';
import { initSocket } from './socket/socket.manager';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Attach Socket.IO
const io = initSocket(httpServer);

app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Robust server running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.IO ready`);
});