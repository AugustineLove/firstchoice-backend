"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordTransaction = recordTransaction;
exports.getTransactionByOrder = getTransactionByOrder;
exports.getAllTransactions = getAllTransactions;
exports.getTransactionSummary = getTransactionSummary;
const TransactionService = __importStar(require("../services/transaction.service"));
async function recordTransaction(req, res) {
    try {
        const { orderId, paymentMethod, amount } = req.body;
        if (!orderId || !paymentMethod || !amount) {
            res.status(400).json({
                success: false,
                message: 'orderId, paymentMethod and amount are required',
            });
            return;
        }
        if (!['CASH', 'MOMO'].includes(paymentMethod)) {
            res.status(400).json({
                success: false,
                message: 'paymentMethod must be CASH or MOMO',
            });
            return;
        }
        const transaction = await TransactionService.recordTransaction(req.user.id, req.body);
        res.status(201).json({ success: true, data: transaction });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getTransactionByOrder(req, res) {
    try {
        const transaction = await TransactionService.getTransactionByOrder(req.params.orderId, req.user.id);
        res.status(200).json({ success: true, data: transaction });
    }
    catch (err) {
        const code = err.message === 'Access denied' ? 403 : 404;
        res.status(code).json({ success: false, message: err.message });
    }
}
async function getAllTransactions(req, res) {
    try {
        const { paymentStatus, paymentMethod, page, limit } = req.query;
        const result = await TransactionService.getAllTransactions({
            paymentStatus: paymentStatus,
            paymentMethod: paymentMethod,
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 20,
        });
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getTransactionSummary(req, res) {
    try {
        const summary = await TransactionService.getTransactionSummary();
        res.status(200).json({ success: true, data: summary });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=transaction.controller.js.map