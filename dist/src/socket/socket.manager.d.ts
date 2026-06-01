import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
export declare function initSocket(httpServer: HttpServer): SocketServer;
export declare function getIO(): SocketServer;
export declare function notifyUser(userId: string, event: string, data: any): void;
export declare function notifyOrderRoom(orderId: string, event: string, data: any): void;
export declare function notifyAdmins(event: string, data: any): void;
export declare function notifyVendor(vendorId: string, event: string, data: any): void;
export declare function notifyRiders(event: string, data: any): void;
